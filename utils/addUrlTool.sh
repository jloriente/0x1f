#!/bin/bash
#echo usage : addurl url
#echo POST :  {"url":"$1",inactive:"false"}
curl -i -v -X POST http://127.0.0.1:3000/add -H "Content-Type: application/json" -d  '{"url":"'$1'","inactive":"false"}'
#curl -vi --trace-ascii trace.log -X POST http://127.0.0.1:3000/shorter -H "Content-Type: application/json" -d  '{"url":"'$1'","inactive":"false"}'

