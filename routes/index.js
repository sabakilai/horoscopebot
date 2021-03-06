"use stricts";
var express = require('express');
var db = require("../data/db.js");
var sms = require("../models/sms.js");
var newChat = require("../models/newchat.js");
var async = require('async');
var router = express.Router();
var pg = require('pg');
let parser = require('../libs/parser');



/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.post("/", function(req, res, next) {
  var ip = req.connection.remoteAddress;
    var event = req.body.event;
    var selectSign = function() {
      return " Выберите Ваш знак гороскопа, для этого введите нужную цифру:\n1️⃣ Овен .\n2️⃣ Телец. \n3️⃣ Близнецы. \n4️⃣ Рак. \n5️⃣ Лев. \n6️⃣ Дева. \n7️⃣ Весы. \n8️⃣ Скорпион. \n9️⃣ Стрелец. \n1⃣0⃣ Козерог. \n1⃣1⃣ Водолей. \n1⃣2⃣ Рыбы. \n1⃣3⃣ Гороскоп для всех зодиаков.";
    }
    var allComands = function (subscribed) {
      return "Для внесения изменений пришлите мне одну из команд: \n'Сменить', чтобы сменить знак гороскопа. \n'Подписка', чтобы " +(subscribed ? "отключить" : "включить") + " ежедневную рассылку." +
              (subscribed ? "" : "\n'Сегодня', чтобы получить гороскоп на сегодня")
    }

    if(event == "user/unfollow") {
    	var userId = req.body.data.id;
    	db.destroy({where:{userId: userId}}).then(function(err) {
        console.log("db destroyed");
      });
    }
    if(event == "user/follow") {
      var userId = req.body.data.id;
      db.create({userId: userId, ip: ip}).then(function(user) {
        console.log("user follows");
        newChat(userId, ip, function(err, res, body) {
          var chatId = body.data.id;
          var message = "Здравствуйте! Для получения свежего гороскопа, выберите свой знак зодиака, отправив нужную цифру: \n1️⃣ Овен .\n2️⃣ Телец. \n3️⃣ Близнецы. \n4️⃣ Рак. \n5️⃣ Лев. \n6️⃣ Дева. \n7️⃣ Весы. \n8️⃣ Скорпион. \n9️⃣ Стрелец. \n1⃣0⃣ Козерог. \n1⃣1⃣ Водолей. \n1⃣2⃣ Рыбы. \n1⃣3⃣ Гороскоп для всех зодиаков.";
          sms(message, chatId, ip);
        })
      });
    }
    if(event == "message/new") {
      var userId = req.body.data.sender_id;
      db.find({where: {userId: userId}})
      .then(function(user) {

      	var content = req.body.data.content;
      	var chatId = req.body.data.chat_id;
        var subscribed = user.subscribed;
      	if(req.body.data.type != 'text/plain') {
      		console.log(errMessage);
      		sms(errMessage, chatId, ip);
      		return;
      	}
        if (user.state){
          let correctAnswer = ["1","2","3","4","5","6","7","8","9","10","11","12","13"];
          let errMessage = "Неверная команда. " + selectSign();
          let sign_name;
          let sign_db;
          if (correctAnswer.indexOf(content)>= 0) {
            switch(content) {
                case "1": sign_name = "Овен"; sign_db = 1; break;
                case "2": sign_name = "Телец"; sign_db = 2; break;
                case "3": sign_name = "Близнецы"; sign_db = 3; break;
                case "4": sign_name = "Рак"; sign_db = 4; break;
                case "5": sign_name = "Лев"; sign_db = 5; break;
                case "6": sign_name = "Дева"; sign_db = 6; break;
                case "7": sign_name = "Весы"; sign_db = 7; break;
                case "8": sign_name = "Скорпион"; sign_db = 8; break;
                case "9": sign_name = "Стрелец"; sign_db = 9; break;
                case "10": sign_name = "Козерог"; sign_db = 10; break;
                case "11": sign_name = "Водолей"; sign_db = 11; break;
                case "12": sign_name = "Рыбы"; sign_db = 12; break;
                case "13": sign_db = 13; break;
            };
            let message = (content==13 ? "Вы выбрали гороскоп для всех знаков. Следующим сообщением вы получите гороскоп на сегодня." : "Вы выбрали знак "+ sign_name +". Следующим сообщением вы получите гороскоп на сегодня");
            db.update({sign: sign_db, state:false}, {where: {userId: userId}}).then(function(user) {
              sms(message, chatId, ip, function() {
                setTimeout(function() {
                  parser.getHoroscope(sign_db,'today', function(result) {
                    sms(result, chatId, ip,function() {
                      setTimeout(function() {
                        sms(allComands(subscribed), chatId, ip);
                      }, 3000);
                    });
                  })
                }, 1000);
              })
            })
          }
          else {
        		sms(errMessage, chatId, ip);
          }
        } else {
          var errMessage = "Неверная команда. " + allComands(subscribed);
          if(content == "Сменить"){
            db.update({state: true}, {where: {userId: userId}}).then(function(user) {
              sms(selectSign(), chatId, ip);
            })
          }
          else if (content == "Подписка") {
            if(subscribed) {
              db.update({subscribed: false}, {where: {userId: userId}}).then(function(user) {
                let message = "Вы отключили ежедневную рассылку. "+allComands(!subscribed);
                sms(message, chatId, ip);
              })
            } else {
              db.update({subscribed: true}, {where: {userId: userId}}).then(function(user) {
                let message = "Вы включили ежедневную рассылку. "+allComands(!subscribed);
                sms(message, chatId, ip);
              })
            }
          }
          else if (content == "Сегодня"){
            parser.getHoroscope(user.sign, 'today', function(result) {
              sms(result, chatId, ip,function() {
                setTimeout(function() {
                  sms(allComands(subscribed), chatId, ip);
                }, 3000);
              });
            })
          } else {
      		sms(errMessage, chatId, ip);
          }
        }
     })
    }
  res.end();
});



module.exports = router;
