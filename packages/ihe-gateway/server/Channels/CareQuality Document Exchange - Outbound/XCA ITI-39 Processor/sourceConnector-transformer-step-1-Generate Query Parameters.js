// Check for the documentReference list in the incoming message
if (!msg.hasOwnProperty('documentReference')) throw 'ERROR - The required documentReference is missing. The processing has been stopped.';

var parameterList = new XMLList();

// Generate one or more requests, each of which representing an individual document 
// that the Document Consumer wants to retrieve from the Document Repository
msg.documentReference.forEach(function(entry) {
	var docRequest = getXCA39DocumentRequest(entry);
	if (docRequest) parameterList += docRequest;
});