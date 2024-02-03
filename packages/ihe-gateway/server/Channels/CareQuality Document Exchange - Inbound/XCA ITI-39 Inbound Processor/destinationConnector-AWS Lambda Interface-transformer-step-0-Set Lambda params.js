// Set the parameters required for the AWS Lambda
channelMap.put('URL', configurationMap.get('INBOUND.XCA39'));

channelMap.put('DEST_ID', 'd' + connectorMessage.getDestinationIdMap().get('AWS Lambda Interface'));

// Message ID required for Attachment
channelMap.put('XCAMESSAGEID', java.lang.Long(connectorMessage.getMessageId()));