var file = require('fs');
var express = require('express');
var router = express.Router();
var http = require('http');

var SERVER_ADDRESS = '192.168.56.102';

function deleteFlow(node, srcIP, dstIP){
  var data =  '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n'+
              '<input xmlns="urn:opendaylight:flow:service">\n'+
                '<barrier>false</barrier>\n'+
                '<node xmlns:inv="urn:opendaylight:inventory">/inv:nodes/inv:node[inv:id="'+node+'"]</node>\n'+
                '<cookie>500</cookie>\n' +
                '<hard-timeout>0</hard-timeout>\n' +
                '<idle-timeout>0</idle-timeout>\n' +
                '<installHw>false</installHw>\n' +
                '<match>\n' +
                  '<ethernet-match>\n' +
                    '<ethernet-type>\n'+
                      '<type>2048</type>\n'+
                    '</ethernet-type>\n'+
                  '</ethernet-match>\n'+
                  '<ipv4-source>'+srcIP+'/32</ipv4-source>\n'+
                  '<ipv4-destination>'+dstIP+'/32</ipv4-destination>\n'+
                '</match>\n'+
                // '<instructions>\n'+
                //   '<instruction>\n'+
                //   '<order>0</order>\n'+
                //     '<apply-actions>\n'+
                //       '<action>\n'+
                //         '<order>0</order>\n'+
                //         '<output-action>\n'+
                //           '<output-node-connector>'+output+'</output-node-connector>\n'+
                //         '</output-action>\n'+
                //       '</action>\n'+
                //     '</apply-actions>\n'+
                //   '</instruction>\n'+
                // '</instructions>\n'+
                '<priority>1000</priority>\n'+
                '<strict>false</strict>\n'+
                '<table_id>0</table_id>\n'+
              '</input>\n';

  var options = {
    hostname: SERVER_ADDRESS,
    port: 8181,
    path: '/restconf/operations/sal-flow:remove-flow',
    method: 'POST',
    auth: 'admin:admin',
    headers: {
      'Content-Type': 'application/xml',
      'Content-Length': data.length
    }
  }

  var req = http.request(options,function (res) {
    if(res.statusCode == 200){
      console.log("REMOVE FLOW OK");
    }
    else{
      console.log("REMOVE FLOW FAIL");
    }
  });

  req.write(data);
  req.end();
}

function updateFlow(node, srcIP, dstIP, output){
  file.readFile('database/route.json','utf-8', function (err, data) {
    if(err) {
      console.log(err);
    }
    else {
      var routes = eval(data);
      for(var i in routes) {
        var switchs = eval(routes[i].switchs);
        alert(routes[i].srcIP);
      }
    }
  })
}

function addFlow(node, srcIP, dstIP, output){
  var data;
  var data1 =  '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n'+
                '<input xmlns="urn:opendaylight:flow:service">\n'+
                '<barrier>false</barrier>\n'+
                '<node xmlns:inv="urn:opendaylight:inventory">/inv:nodes/inv:node[inv:id="'+node+'"]</node>\n'+
                '<cookie>500</cookie>\n' +
                '<hard-timeout>0</hard-timeout>\n' +
                '<idle-timeout>0</idle-timeout>\n' +
                '<installHw>false</installHw>\n' +
                '<match>\n' +
                  '<ethernet-match>\n' +
                    '<ethernet-type>\n'+
                      '<type>2048</type>\n'+
                    '</ethernet-type>\n'+
                  '</ethernet-match>\n';
  var data2 =     '<ipv4-destination>'+dstIP+'/32</ipv4-destination>\n'+
                '</match>\n'+
                '<instructions>\n'+
                  '<instruction>\n'+
                    '<order>0</order>\n'+
                    '<apply-actions>\n'+
                      '<action>\n'+
                        '<order>0</order>\n'+
                        '<output-action>\n'+
                          '<output-node-connector>'+output+'</output-node-connector>\n'+
                        '</output-action>\n'+
                      '</action>\n'+
                    '</apply-actions>\n'+
                  '</instruction>\n'+
                '</instructions>\n'+
                '<priority>1000</priority>\n'+
                '<strict>false</strict>\n'+
                '<table_id>0</table_id>\n'+
              '</input>\n';

  if(srcIP!=null){
    data = data1  +  '<ipv4-source>'+ srcIP +'/32</ipv4-source>\n'+ data2;
  }
  else{
    data = data1 + data2;
  }
  //console.log(data);
  var options = {
    hostname: SERVER_ADDRESS,
    port: 8181,
    path: '/restconf/operations/sal-flow:add-flow',
    method: 'POST',
    auth: 'admin:admin',
    headers: {
      'Content-Type': 'application/xml',
      'Content-Length': data.length
    }
  };
  
  var req = http.request(options,function (res) {
    if(res.statusCode == 200){
      console.log("OK");
    }
    else{
      console.log("FAIL "+eval(res.StatusCode));
    }
  });

  req.write(data);
  req.end();
}

 function updateRoute(){
  file.readFile('database/route.json','utf-8',function(err,data){
    if(err){
      console.log(err);
    }
    else{
      var routes = eval(data);
      for(var i in routes){
        var output;
        if(routes[i].switches[1] == "openflow:2"){
          output = 3;
        }
        else{
          output = 4;
        }
        addFlow(routes[i].switches[0],routes[i].srcIP,routes[i].dstIP,output);
        addFlow(routes[i].switches[2],routes[i].dstIP,routes[i].srcIP,output-2);
      }
    }
  })
}

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.post('/set',function (req,res,next) {
  var body = eval(req.body)

  file.readFile('database/route.json','utf-8', function (err, data) {
    if(err) {
      console.log(err);
    }
    else {
      var routes = eval(data);
      var route = routes[eval('body.id')];
      if(route.switches[1] != body.switch){
        var port = 0;
        if(body.switch == "openflow:2"){
          port = 3;
        }else{
          port = 4;
        }
        deleteFlow(route.switches[0],route.srcIP,route.dstIP);
        addFlow(route.switches[0],route.srcIP,route.dstIP,port);
        deleteFlow(route.switches[2],route.dstIP,route.srcIP);
        addFlow(route.switches[2],route.dstIP,route.srcIP,port-2);
        var temp = [];
        route.switches[1]=body.switch;
        for(var i in routes){
          if(i == eval('body.id')){
            temp.push(route);
          }else{
            temp.push(routes[i]);
          }
        }
        file.writeFile('database/route.json',JSON.stringify(temp,null,2));
        
      }

      res.send();
    }
  })
})

updateRoute();

module.exports = router;
