#!/bin/bash
#echo usage : addurl url
#echo POST :  {"url":"$1",inactive:"false"}
curl -i -v -X POST http://127.0.0.1:3000/update -H "Content-Type: application/json" -d  '{"_id":"jr3ji","_rev":"2-7c4ae3a010d4cd715d4b5c514155cf12", "url" : "innerfunction.com","inactive":"true"}'
#curl -vi --trace-ascii trace.log -X POST http://127.0.0.1:3000/shorter -H "Content-Type: application/json" -d  '{"url":"'$1'","inactive":"false"}'

