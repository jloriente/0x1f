#!/bin/bash
#echo usage : addurl url
#echo POST :  {"url":"$1",inactive:"false"}

curl -i -v -X GET http://127.0.0.1:3000/url?url="innerfunction.com" 

#curl -i -v -X PUT http://127.0.0.1:3000/add -H "Content-Type: application/json" -d  '{"url":"'$1'","domain":"whelans","inactive":"false"}'

#curl -vi --trace-ascii trace.log -X POST http://127.0.0.1:3000/shorter -H "Content-Type: application/json" -d  '{"url":"'$1'","inactive":"false"}'

