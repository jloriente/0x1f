#!/bin/bash
echo usage : addurl $url
curl -iv -X PUT http://127.0.0.1:5984/urldb/hihi -H "Content-Type: application/json" -H "Referer:http://127.0.0.1:5984/urldb/hihi" -d  '{"_id":"hihi","url":"test","inactive":"false"}'




