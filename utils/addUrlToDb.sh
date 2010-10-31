#!/bin/bash
#echo usage : addurl url
echo POST :  {"url":"$1",inactive:"false"}
curl -X POST http://localhost:5984/urldb -H "Content-Type: application/json" -d  '{"url":"'$1'","inactive":"false"}'

