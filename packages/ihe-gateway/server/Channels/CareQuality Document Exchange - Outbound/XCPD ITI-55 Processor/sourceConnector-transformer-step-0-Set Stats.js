// Store for stat
channelMap.put('MSG_ID', msg.id.toString());
channelMap.put('CUSTOMER_ID', msg.cxId.toString());
channelMap.put('PATIENT_ID', msg.patientResource.id.toString());

// Store for further processing
channelMap.put('REQUEST', msg);