Tasks = new Mongo.Collection("tasks");
Lists = new Mongo.Collection("lists");
Wanties = new Mongo.Collection("wanties");
Items = new Mongo.Collection("items");

Router.configure({
    layoutTemplate: 'main',
    loadingTemplate: 'loading'
});

Router.configure({
    layoutTemplate: 'startpage'
});

Router.route('/', function() {
    this.layout('startpage');
    this.render('Start');
});

Router.route('/home', function() {
    this.layout('main');
    this.render('Start');
});

Router.route('/todos',{
    layoutTemplate: 'main',
    template: 'Lists'
});

Router.route('/list/:_id', {
    layoutTemplate: 'main',
    template: 'Checklist',
    data: function(){
        var currentList = this.params._id;
        var currentUser = Meteor.userId();
        return Lists.findOne({ _id: currentList });
    },

    onBeforeAction: function(){
        console.log("You triggered 'onBeforeAction' for 'listPage' route.");
        var currentUser = Meteor.userId();
        if(currentUser){
            // logged-in
            this.next();
        } else {
            // not logged-in
            this.render("Start");
        }
    },
    waitOn: function(){
        var currentList = this.params._id;
        return [ Meteor.subscribe('Lists'), Meteor.subscribe('Tasks', currentList) ]
    }
});

Router.route('/wanties',{
    layoutTemplate: 'main',
    template: 'Wanties'
});

Router.route('/wanties/:_id', {
    layoutTemplate: 'main',
    template: 'Items',
    data: function(){
        var currentWanties = this.params._id;
        var currentUser = Meteor.userId();
        return Wanties.findOne({ _id: currentWanties });
    },

    onBeforeAction: function(){
        console.log("You triggered 'onBeforeAction' for 'listPage' route.");
        var currentUser = Meteor.userId();
        if(currentUser){
            // logged-in
            this.next();
        } else {
            // not logged-in
            this.render("Start");
        }
    },
    waitOn: function(){
        var currentWanties = this.params._id;
        return [ Meteor.subscribe('Wanties'), Meteor.subscribe('Items', currentWanties) ]
    }
});

if (Meteor.isClient) {

    $.validator.setDefaults({
        rules: {
            email: {
                required: true,
                email: true
            },
            password: {
                required: true,
                minlength: 6
            }
        },
        messages: {
            email: {
                required: "You must enter an email address.",
                email: "You've entered an invalid email address."
            },
            password: {
                required: "You must enter a password.",
                minlength: "Your password must be at least {0} characters."
            }
        }
    });

    Template.Start.onCreated(function(){
        console.log("The 'login' template was just created.");
    });

    Template.Start.onRendered(function(){
        console.log("The 'login' template was just rendered.");

        var loginValidator = $('.login').validate({
            submitHandler: function(event){
                var email = $('#login-email').val();
                var password = $('#login-pass').val();
                Meteor.loginWithPassword(email, password, function(error){
                    if(error){
                        if(error.reason == "User not found"){
                            loginValidator.showErrors({
                                email: error.reason
                            });
                        }
                        if(error.reason == "Incorrect password"){
                            loginValidator.showErrors({
                                password: error.reason
                            });
                        }
                    } else {
                        var currentRoute = Router.current().route.getName();
                        if(currentRoute == "Start"){
                            Router.go("/todos");
                        }
                    }
                });
            }
        });

        var regValidator = $('.register').validate({
            submitHandler: function(event){
                var email = $('#reg-email').val();
                var password = $('#reg-pass').val();
                Accounts.createUser({
                    email: email,
                    password: password
                 }, function(error){
                    if(error){
                        if(error.reason == "Email already exists."){
                            regValidator.showErrors({
                                email: "That email already belongs to a registered user."
                            });
                        }
                    } else {
                        Router.go("/lists"); // Redirect user if registration succeeds
                    }
                 });
            }
        });
    });

    Template.Start.onDestroyed(function(){
        console.log("The 'login' template was just destroyed.");
    });

    Template.Start.events({
        'submit .register': function(){
            event.preventDefault();
        },

        'submit .login': function(){
            event.preventDefault();
        }

    });

    Template.Header.events({
        'click .logout': function () {
            event.preventDefault();
            Meteor.logout();
            Router.go('');
        }
    });

    Template.Lists.onCreated(function () {
        this.subscribe('Lists');
    });

  Template.Lists.events({

    "submit .new-list": function (event, template) {
      // Prevent default browser form submit
      event.preventDefault();

      // Get value from form element
      var text = event.target.text.value;
        Meteor.call('createNewList', text, function(error, results){
            if(error){
                console.log(error.reason);
            } else {
                // Clear form
                event.target.text.value = "";
            }
        });

    },

    'click .remove': function(event){
      event.preventDefault();
      var currentList = this._id;
      Meteor.call("deleteList", currentList);
    }
  });

  Template.Lists.helpers({
    lists: function () {
        var currentUser = Meteor.userId();
        // Otherwise, return all of the tasks
        return Lists.find({$or: [{ createdBy: currentUser }, { collaborators: { $elemMatch: { _id: currentUser } } }]}, {sort: {createdAt: 1}});
    }
  });

  // This code only runs on the client
  Template.Checklist.helpers({
    tasks: function () {
      var currentList = this._id;
        var currentUser = Meteor.userId();
      if (Session.get("hideCompleted")) {
        // If hide completed is checked, filter tasks
        return Tasks.find({ listId: currentList}, {checked: {$ne: true}}, {sort: {createdAt: -1}});
      } else {
        // Otherwise, return all of the tasks
        return Tasks.find({ listId: currentList}, {sort: {createdAt: -1}});
      }
    },
    hideCompleted: function () {
      return Session.get("hideCompleted");
    },
      incompleteCount: function () {
          var currentList = this._id;
          var currentUser = Meteor.userId();
        return Tasks.find({checked: {$ne: true}, listId: currentList}).count();
      }

  });

  Template.Checklist.events({
    "submit .new-task": function (event) {
      // Prevent default browser form submit
      event.preventDefault();

      // Get value from form element
      var text = event.target.text.value;
      var currentList = this._id;


      Meteor.call('createListItem', text, currentList, function(error){
          if(error){
              console.log(error.reason);
          } else {
              event.target.text.value = "";
          }
      });
    },

      "change .hide-completed input": function (event) {
        Session.set("hideCompleted", event.target.checked);
      },

      'click .checkbox': function(event){
        var icon = $(event.target);
        icon.parent().siblings('.toggle-checked').click();
      },

      'submit .collaborate': function (event){
          event.preventDefault();

          var email = event.target.email.value;
          var currentList = this._id;

          alert(email + ' ' + currentList);

          Meteor.call('addCollaborator', email, currentList, function(error){
              if(error){
                  console.log(error.reason);
                  alert('FEL');
              }else{
                  event.target.email.value = "";
              }
          });
      },
      'click .fa-cog': function (){
          $('.dropdown').toggleClass('hidden');
      }
  });

  Template.task.events({
    "click .toggle-checked": function () {
      // Set the checked property to the opposite of its current value
        var documentId = this._id;
        var isCompleted = this.checked;
        if(isCompleted){
            Meteor.call('changeItemStatus', documentId, false);
        } else {
            Meteor.call('changeItemStatus', documentId, true);
        }
    },

    "click .delete": function (event) {
        event.preventDefault();
        var documentId = this._id;
        Meteor.call('removeListItem', documentId);
    }
  });

    Template.Wanties.onCreated(function () {
        this.subscribe('Wanties');
    });

    Template.Wanties.helpers({
        wanties: function () {
            var currentUser = Meteor.userId();
            // Otherwise, return all of the tasks
            return Wanties.find({$or: [{ createdBy: currentUser }, { collaborators: { $elemMatch: { _id: currentUser } } }]}, {sort: {createdAt: 1}});
        }
    });

    Template.Wanties.events({
        "submit .new-wanties": function (event) {
            // Prevent default browser form submit
            event.preventDefault();

            // Get value from form element
            var text = event.target.text.value;
            Meteor.call('createNewWanties', text, function(error, results){
                if(error){
                    console.log(error.reason);
                } else {
                    // Clear form
                    event.target.text.value = "";
                }
            });
        }
    });

    // This code only runs on the client
    Template.Items.helpers({
        items: function () {
            var currentWanties = this._id;
            var currentUser = Meteor.userId();
            // Return all of the items
            return Items.find({ wantiesId: currentWanties}, {sort: {createdAt: -1}});

        }
    });

    Template.Items.events({
        "submit .new-wantie": function (event) {
            // Prevent default browser form submit
            event.preventDefault();

            // Get value from form element
            var img = $('#img').val();
            var text = $('#name').val();
            var price = $('#price').val();
            var link = $('#link').val();
            var currentWanties = this._id;
            console.log(img, text, price, link);
            console.log(currentWanties);

            Meteor.call('createWantieItem', img, text, price, link, currentWanties, function(error){
                if(error){
                    console.log(error.reason);
                } else {
                    /*Töm fält*/
                    $('#img').val("");
                    $('#name').val("");
                    $('#price').val("");
                    $('#link').val("");
                }
            });
        },

        'submit .collaborate': function (event){
            event.preventDefault();

            var email = event.target.email.value;
            var currentWanties = this._id;

            alert(email + ' ' + currentWanties);

            Meteor.call('addCollaborator', email, currentWanties, function(error){
                if(error){
                    console.log(error.reason);
                    alert('FEL');
                }else{
                    event.target.email.value = "";
                }
            });
        },
        'click .fa-cog': function (){
            $('.dropdown').toggleClass('hidden');
        }
    });

}

if (Meteor.isServer) {
    Meteor.publish('Lists', function(){
        var currentUser = this.userId;
        return Lists.find({$or: [{ createdBy: currentUser }, { collaborators: { $elemMatch: { _id: currentUser } } }]} );
    });

    Meteor.publish('Tasks', function(currentList){
        var currentUser = this.userId;
        return Tasks.find({ listId: currentList  })
    });

    Meteor.publish('Wanties', function(){
        var currentUser = this.userId;
        return Wanties.find({$or: [{ createdBy: currentUser }, { collaborators: { $elemMatch: { _id: currentUser } } }]} );
    });

    Meteor.publish('Items', function(currentWanties){
        var currentUser = this.userId;
        return Items.find({ wantiesId: currentWanties  })
    });

    Meteor.methods({
        'createNewList': function(text){
            var currentUser = Meteor.userId();
            check(text, String);
            if(text == ""){
                text = defaultName(currentUser);
            }
            var data = {
                name: text,
                createdAt: new Date(), // current time
                createdBy: currentUser,
                collaborators: []
            };
            if(!currentUser){
                throw new Meteor.Error("not-logged-in", "You're not logged-in.");
            }
            return Lists.insert(data);
        },
        'createListItem': function(text, currentListId){
            check(text, String);
            check(currentListId, String);
            var currentList = Lists.findOne(currentListId);
            var currentUser = Meteor.userId();
            var collaborator = search(currentUser, currentList.collaborators);
            console.log(collaborator);
            if((currentList.createdBy != currentUser) && !collaborator){
                throw new Meteor.Error("invalid-user", "You don't own that list.");
            }
            if(!currentUser){
                throw new Meteor.Error("not-logged-in", "You're not logged-in.");
            }
            var data = {
                text: text,
                completed: false,
                createdAt: new Date(), // current time
                listId: currentListId
            };
            console.log(data);
            return Tasks.insert(data);
        },
        'changeItemStatus': function(documentId, status){
            check(status, Boolean);
            var currentUser = Meteor.userId();
            var data = { _id: documentId};
            if(!currentUser){
                throw new Meteor.Error("not-logged-in", "You're not logged-in.");
            }
            Tasks.update(data, {$set: { checked: status }});
        },
        'removeListItem': function(documentId){
            check(documentId, String);
            var currentUser = Meteor.userId();
            if(!currentUser){
                throw new Meteor.Error("not-logged-in", "You're not logged-in.");
            }
            var data = {
                _id: documentId
            };
            Tasks.remove(data);
        },
        'deleteList': function(currentListId){
            check(currentListId, String);
            var currentUser = Meteor.userId();
            var currentList = Lists.findOne(currentListId);

            if(!currentUser){
                throw new Meteor.Error("not-logged-in", "You're not logged-in.");
            }else if((currentList.createdBy !== currentUser)){
                throw new Meteor.Error("invalid-user", "You're not the owner.");
            }
            Lists.remove(currentList);
            Tasks.remove({listId: currentList});
        },
        'addCollaborator': function(email, currentListId){
            var currentUser = Meteor.userId();
            if(!currentUser){
                throw new Meteor.Error("not-logged-in", "You're not logged-in.");
            }

            var user = Meteor.users.findOne({"emails.address": email});
            if(currentUser === user._id){
                throw new Meteor.Error("invalid-user", "The email you entered is the owner of this list.");
            }

            var userExists = Lists.find({_id:currentListId}, {collaborators: {_id:user._id, email: email}});
            if(userExists){
                throw new Meteor.Error("invalid-user", "This user already collaborates.");
            }



            Lists.upsert({_id:currentListId},{$push: {collaborators: {_id:user._id, email: email}}});
        },
        'createNewWanties': function(text){
            var currentUser = Meteor.userId();
            check(text, String);
            if(text == ""){
                text = defaultName(currentUser);
            }
            var data = {
                name: text,
                createdAt: new Date(), // current time
                createdBy: currentUser,
                collaborators: []
            };
            if(!currentUser){
                throw new Meteor.Error("not-logged-in", "You're not logged-in.");
            }
            return Wanties.insert(data);
        },
        'createWantieItem': function(img, text, price, link, currentWantiesId){
            /*check(img, String);
            check(text, String);
            check(price, Number);
            check(link, String);
            check(currentWantiesId, String);*/
            var currentWanties = Wanties.findOne(currentWantiesId);
            var currentUser = Meteor.userId();
            var collaborator = search(currentUser, currentWanties.collaborators);
            console.log(collaborator);
            if((currentWanties.createdBy != currentUser) && !collaborator){
                throw new Meteor.Error("invalid-user", "You don't own that list.");
            }
            if(!currentUser){
                throw new Meteor.Error("not-logged-in", "You're not logged-in.");
            }
            var data = {
                img: img,
                text: text,
                price: price,
                link: link,
                createdAt: new Date(), // current time
                wantiesId: currentWantiesId
            };
            console.log(data);
            return Items.insert(data);
        }
    });

    function defaultName(currentUser) {
        var nextLetter = 'A';
        var nextName = 'List ' + nextLetter;
        while (Lists.findOne({ name: nextName, createdBy: currentUser })) {
            nextLetter = String.fromCharCode(nextLetter.charCodeAt(0) + 1);
            nextName = 'List ' + nextLetter;
        }
        return nextName;
    }

    function search(nameKey, myArray){
        for (var i=0; i < myArray.length; i++) {
            if (myArray[i]._id === nameKey) {
                return myArray[i];
            }
        }
    }
}