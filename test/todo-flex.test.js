/*
  MIT License,
  Copyright (c) 2015, Richard Rodger and other contributors.
*/

'use strict'

var Assert = require('assert')
var Lab = require('lab')
var Code = require('code')
var Seneca = require('seneca')

var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it
var expect = Code.expect

var test_options = { log: 'test' }

describe('todo-flex', function () {

  it('load-as-plugin', function (done) {
    Seneca( test_options ).error(done).use('..').ready( done )
  })

  it('Should mark a todo as closed', function (done) {
    Seneca( test_options )
      .error(done)
      .use('..')
      .ready(function () {
        var seneca = this

        seneca
          .make('flex/todo', {text: 'foo', mark: 'open'})
          .save$( function ( err, todo ) {
            seneca.act('role:flex, flex:todo, cmd:mark, mark:closed, task:' + todo.id, function (err, closed_todo) {
              Assert.equal(closed_todo.id, todo.id)
              Assert.equal(closed_todo.mark, 'closed')
              done()
            })
          })
      })
  })

  it('Should add a todo within a list', function (done) {
    Seneca(test_options)
      .error(done)
      .use('..')
      .ready(function () {
        var seneca = this

        var todolist = seneca.make('flex/todolist', {name: 'My List 1', user: 1})
        todolist.save$(function (err, todolist) {
          var list = todolist.id

          seneca
            .make('flex/todo', {text: 'foo', mark: 'open', list: list})
            .save$(function (err, new_todo) {
              Assert.equal(new_todo.list, todolist.id)
              done()
            })
        })
      })
  })

  it('Should filter and return list of todo items', function (done) {
    Seneca(test_options)
      .error(done)
      .use('..')
      .ready(function () {
        var seneca = this

        var todolist = seneca.make('flex/todolist', {name: 'My List 1', user: 1})
        todolist.save$(function (err, todolist) {
          var list = todolist.id

          seneca
            .make('flex/todo', {text: 'foo', mark: 'open', list: list})
            .save$(function (err, new_todo) {
              seneca.act('role:flex, flex:todo, cmd:tasks, mark:open, list:' + list, function (err, todos) {
                expect(todos.length).to.be.above(0)
                done()
              })
            })
        })
      })
  })
})
