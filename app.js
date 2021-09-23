const express = require('express');
var mqtt = require('mqtt')
var https = require("https");
const dbData = require('./firebase/firebaseConfig');
const { error } = require('console');

const fs = require("fs");

// to prevent app from sleeping  

setInterval(function () {
    https.get("https://sheltered-plains-26987.herokuapp.com/");
    console.log("ping to web app")
}, 300000); // every 5 minutes (300000)




var options = {
    port: 1883,
    host: "test.mosquitto.org",
    clientId: "assssssssssssssssssssss",
    protocol: "mqtt"
}

var client = mqtt.connect(options)




const app = express()
app.use(express.urlencoded());
app.use(express.json());


var message = "";

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
});


app.get('/api', function (req, res) {


    fs.readFile("./data.json", "utf8", (err, jsonString) => {
        if (err) {
            console.log("Error reading file from disk:", err);
            return;
        }
        try {
            res.status(200).send(JSON.parse(jsonString))
        } catch (err) {
            res.status(400).send(JSON.parse({
                "totalEmployee": 0,
                "presentEmployees": [],
                "presentTotal": 0,
                "absentEmployees": [],
                "absentTotal": 0
            }))
        }
    });

})

client.on('connect', function () {
    client.subscribe('rajkotCityPoliceBleStatus', function (err) {
        console.log("subscribed")
    })
    console.log("connected");
})

client.on('reconnect', function () {

    console.log("reconnect");
})

client.on('close', function () {

    console.log("close");
})


client.on('disconnect', function () {

    console.log("disconnect");
})


client.on('error', function () {

    console.log("error");
})


function isJson(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}


client.on('message', function (topic, message) {
    if (topic === "rajkotCityPoliceBleStatus" && isJson(message)) {

        var mqttMessage = JSON.parse(message);
        var totalEmployee = 0;
        var presentEmployees = [];


        console.log("message is json", mqttMessage.devices)
        dbData.getAllEmployee().then((employee) => {
            totalEmployee = employee.length;
            mqttMessage.devices = [...new Set(mqttMessage.devices)]
            for (var i = 0; i < mqttMessage.devices.length; i++) {

                for (var j = 0; j < employee.length; j++) {
                    // console.log(employee[j].data.bleData)
                    if (mqttMessage.devices[i] === employee[j].data.bleData) {
                        // console.log("present")
                        presentEmployees.push(employee[j]);
                    }

                }
            }
            // console.log("present employees", presentEmployees);
            var absentEmployees = employee.filter(x => presentEmployees.indexOf(x) === -1);
            for (let index = 0; index < presentEmployees.length; index++) {
                console.log(presentEmployees[index].data.firstName)
            }
            console.log("absent employees");
            for (let index = 0; index < absentEmployees.length; index++) {
                console.log(absentEmployees[index].data.firstName)
            }

            var data = {
                "totalEmployee": totalEmployee,
                "presentEmployees": presentEmployees,
                "presentTotal": presentEmployees.length,
                "absentEmployees": absentEmployees,
                "absentTotal": absentEmployees.length
            }

            const jsonString = JSON.stringify(data)
            fs.writeFileSync('./data.json', jsonString)

        }).catch(error => console.log(error))
    }




    // message is Buffer


    client.publish("bleAck", message.toString());
    message = "got message from : " + topic + ":" + message.toString();
    console.log(message);

})

app.listen(process.env.PORT || 3005, () => {
    console.log("app is running on port");
})