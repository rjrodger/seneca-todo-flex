/*
  MIT License,
  Copyright (c) 2015, Richard Rodger and other contributors.
*/

'use strict'


var _ = require('lodash')
var Connect = require('connect')
var Error = require('eraro')({
  msgmap: {
    'no-task': 'A todo entity is required; pass via the todo message property.',
    'invalid-mark': 'Invalid mark <%=mark%> for todo <%=todo%>.',
    'no-user-id': 'user needs to be passed; pass via the user message property'
  }
})

module.exports = function (options) {
  var seneca = this
  var plugin = 'todo-flex'

  // merge default options with any provided by the caller
  options = seneca.util.deepextend({
    marks: ['open', 'closed'],
    default_data: {},
    prefix: '/todo'
  }, options)

  // To mark task item as open/closed
  seneca.add('role:flex, flex:todo, cmd:mark', ensure_entity(task_mark))

  function task_mark (msg, done) {
    if ( !msg.task ) {
      return done(Error('no-task'))
    }

    if ( !msg.mark || !_.includes(options.marks, msg.mark)) {
      return done(Error('invalid-mark', msg))
    }

    msg.task.mark = msg.mark

    msg.task.save$(done)
  }

  // To filter todo lists based on user ownership.
  seneca.add('role:flex, flex:todolist, cmd:lists', function (msg, done) {
    if (!msg.user) {
      return done(Error('no-user-id'))
    }

    var todolist = seneca.make('flex/todolist')
    todolist.list$({user: msg.user}, done)
  })

  seneca.add('role:flex, flex:todo, cmd:task', function (msg, done) {
    if (!msg.list) {
      return done(Error('no-list-id'))
    }

    var task = seneca.make('flex/todo')
    task.task = msg.task
    task.list = msg.list
    task.mark = 'open'
    task.save$(function (err, new_task) {
      done(null, {
        id: new_task.id,
        task: new_task.task,
        list: new_task.list
      })
    })
  })

  // To filter todo items based on state.
  seneca.add('role:flex, flex:todo, cmd:tasks', function (msg, done) {
    var filterObj = {}

    if (msg.mark) {
      filterObj.mark = msg.mark
    }

    if (msg.list) {
      filterObj.list = msg.list
    }

    var todo = seneca.make('flex/todo')
    todo.list$(filterObj, done)
  })

  var app = Connect()

  // "web-interface"
  seneca.act({role: 'web', use: {
    prefix: options.prefix,
    pin: {role: 'flex', cmd: '*'},

    // "map"
    map: {
      lists: {
        GET: function (req, res, args, act, respond) {
          var user = req.seneca && req.seneca.user
          args.user = user.id
          act(args, respond)
        },
        POST: function (req, res, args, act, respond) {
          var user = req.seneca && req.seneca.user
          var todolist = seneca.make('flex/todolist')

          todolist.name = req.body.name
          todolist.user = user.id
          todolist.save$(function (err, todolist) {
            respond(null, {
              id: todolist.id,
              name: todolist.name
            })
          })
        }
      },
      tasks: {
        GET: function (req, res, args, act, respond) {
          args.list = req.params.list
          act(args, respond)
        },
        POST: function (req, res, args, act, respond) {
          var list = req.params.list
          var task_text = req.body.task
          seneca
            .make('flex/todo', {task: task_text, mark: 'open', list: list})
            .save$(function (err, new_task) {
              respond(null, {
                id: new_task.id,
                task: new_task.task,
                mark: new_task.mark
              })
            })
        },
        suffix: '/:list'
      },
      mark: {
        POST: function (req, res, args, act, respond) {
          act(args, respond)
        }
      }
    },

    // @end
    endware: function (req, res, next) {
      if (0 !== req.url.indexOf(options.prefix)) return next()

      req = _.clone(req)
      req.url = req.url.substring(options.prefix.length)

      if ('' === req.url) {
        res.writeHead(301, {
          'Location': options.prefix + '/'
        })
        return res.end()
      }

      return app(req, res, next)
    }
  }})

  return plugin
}

function ensure_entity (action) {
  return function (msg, done) {
    if (msg && msg.task) {
      this.make('flex/todo').load$(msg.task, function (err, task) {
        if (err) {
          return done(err)
        }
        msg.task = task

        return action.apply(this, [msg, done])
      })
    }
    else {
      return done(Error('no-task'))
    }
  }
}
