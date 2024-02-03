// Store the HTTP code only
var http = $('responseStatusLine');
http = String(http).replace('HTTP/1.1 ', '').replace(/\D/g, '');
channelMap.put('HTTP', http.toString());

// Decode and parse XCPD ITI-55 (Cross Gateway Patient Discovery Response) message
var xml = null;

var 	ack = '', 
	queryResponseCode = '',
	homeCommunityId = null,
	soapFaultCode = null,
	soapReason = null;

try {

	var soap = msg.toString();

	// Store for testing
	channelMap.put('RESPONSE', soap.toString());

	xml = new XML(soap.toString());

	// SOAP level error
	if (soap.indexOf('Fault') > 0) {
		
		// Case 6: The Initiating Gateway shall accept a SOAP fault representing a transmission error
		soapFaultCode = xml.*::Body.*::Fault.*::Code.*::Value.toString();
		soapReason = xml.*::Body.*::Fault.*::Reason.*::Text.toString();
		
		channelMap.put('ACK', 'SOAP_FAULT');
		channelMap.put('RESULT', soapReason);

		// Generate response to be sent to the app
		var operationOutcome = getOperationOutcome(channelMap.get('MSG_ID'));
		var issue = {
					 "severity": "fatal",
					 "code": "structure",
					 "details": {"text": ""}
				};
		issue.details.text = soapReason.toString();
		operationOutcome.issue.push(issue);

		var _response = getXCPD55ResponseTemplate(channelMap.get('REQUEST'), operationOutcome);
		
		// Send the response back to the app
		var result = router.routeMessageByChannelId(globalMap.get('XCPDAPPINTERFACE'), JSON.stringify(_response));
		
		return;
		
	} else {

		xml = xml.*::Body.*::PRPA_IN201306UV02;

		// Acknowledgement code as described in HL7 message processing rules
		// AA - Receiving application successfully processed message
		// AE - Receiving application found error in processing message. Sending error response with additional error detail information
		// AR - Receiving application failed to process message for reason unrelated to content or format
		ack = xml.*::acknowledgement.*::typeCode.@code.toString();
		channelMap.put('ACK', ack.toString());

		// The result status of the query
		// OK - Query reponse data found for 1 or more result sets matching the query request specification
		// NF - No errors, but no data was found matching the query request specification
		// AE - Query or application error
		// QE - Problem with input Parmeters error
		queryResponseCode = xml.*::controlActProcess.*::queryAck.*::queryResponseCode.@code.toString();
		channelMap.put('QACK', queryResponseCode.toString());
	}
	
} catch(ex) {
	if (globalMap.containsKey('TEST_MODE')) logger.error('XCPD ITI-55 Processor: Response - ' + ex);
	channelMap.put('RESPONSE_ERROR', ex.toString());
}