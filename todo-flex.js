/*
  MIT License,
  Copyright (c) 2015, Richard Rodger and other contributors.
*/

'use strict'


var _ = require('lodash')
var error = require('eraro')({
  msgmap: {
    'no-todo': 'A todo entity is required; pass via the todo message property.',
    'invalid-mark': 'Invalid mark <%=mark%> for todo <%=todo%>.'
  }
})

module.exports = function (options) {
  var seneca = this

  // merge default options with any provided by the caller
  options = seneca.util.deepextend({
    marks: ['open', 'closed']
  }, options)

  seneca.add( 'role:flex, flex:todo, cmd:mark', ensure_entity( todo_mark ) )

  function todo_mark ( msg, done ) {
    if ( !msg.todo ) {
      return done( error( 'no-todo' ) )
    }

    if ( !msg.mark || !_.includes( options.marks, msg.mark) ) {
      return done( error( 'invalid-mark', msg ) )
    }

    msg.todo.mark = msg.mark

    msg.todo.save$( done )
  }

}

// Name the plugin for logging and debugging
Object.defineProperty(module.exports, 'name', { value: 'todo-flex' })


function ensure_entity ( action ) {
  return function () {
    var args = arguments
    var msg = args[0]
    var done = args[1]

    if ( msg && msg.todo && !_.isObject(msg.todo) ) {
      this.make( 'flex/todo' ).load$( msg.todo, function ( err, todo ) {
        if ( err ) {
          return done( err )
        }
        msg.todo = todo

        return action.apply( this, args )
      })
    }
    else {
      return action.apply( this, args )
    }
  }
}
