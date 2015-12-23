/*
  MIT License,
  Copyright (c) 2015, Richard Rodger and other contributors.
*/

'use strict'

var Assert = require('assert')
var Lab = require('lab')
var Seneca = require('seneca')

var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it

var test_options = { log: 'test' }

describe('todo-flex', function () {

  it('load-as-plugin', function (done) {
    Seneca( test_options ).error(done).use('..').ready( done )
  })

  it('mark-todo', function (done) {
    Seneca( test_options )
      .error(done)
      .use('..')
      .ready( function () {
        this
          .make('flex/todo', {text: 'foo', mark: 'open'})
          .save$( function ( err, todo ) {
            this.act(
              'role:flex,flex:todo,cmd:mark,mark:closed,todo:' + todo.id,
              function ( err, closed_todo ) {
                console.log(err)
                Assert.equal( closed_todo.id, todo.id )
                Assert.equal( closed_todo.mark, 'closed' )
                done()
              })
          })
      })
  })
})
