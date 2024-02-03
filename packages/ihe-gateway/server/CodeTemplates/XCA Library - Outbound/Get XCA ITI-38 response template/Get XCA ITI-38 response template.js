/**
	Generates XCA ITI-38 response based on the initial request

	@param {Object} request - Initial JSON request
	@param {Object} operationOutcome - FHIR OperationOutcome with errors, warnings	
	@return {Object} return JSON response
*/
function getXCA38ResponseTemplate(request, operationOutcome) {
	
	var result = request;
	result.responseTimestamp = DateUtil.getCurrentDate("yyyy-MM-dd'T'hh:mm:ss.sssZ");
	if (operationOutcome) result.operationOutcome = operationOutcome;

	delete result.samlAttributes;
	delete result.classCode;
	delete result.practiceSettingCode;
	delete result.facilityTypeCode;
	delete result.documentCreationDate;
	delete result.serviceDate;

	return result;	
}