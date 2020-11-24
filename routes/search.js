/*
 * Copyright (c) 2014-2020 Bjoern Kimminich.
 * SPDX-License-Identifier: MIT
 */

const utils = require('../lib/utils')
const models = require('../models/index')
const challenges = require('../data/datacache').challenges
const { Op } = require("sequelize");

module.exports = function searchProducts () {
  return (req, res, next) => {
    let criteria = req.query.q === 'undefined' ? '' : req.query.q || ''
    criteria = (criteria.length <= 200) ? criteria : criteria.substring(0, 200)
    models.Product.findAll({
      where: {
        [Op.or]: [
          {
            name: {
              [Op.like]: '%' + criteria + '%'
            }
          },
          {
            description: {
              [Op.like]: '%' + criteria + '%'
            }
          }
        ],
        deletedAt: null
      }
    }).then((products) => {
        const dataString = JSON.stringify(products)
        if (utils.notSolved(challenges.unionSqlInjectionChallenge)) {
          let solved = true
          models.User.findAll().then(data => {
            const users = utils.queryResultToJson(data)
            if (users.data && users.data.length) {
              for (let i = 0; i < users.data.length; i++) {
                solved = solved && utils.containsOrEscaped(dataString, users.data[i].email) && utils.contains(dataString, users.data[i].password)
                if (!solved) {
                  break
                }
              }
              if (solved) {
                utils.solve(challenges.unionSqlInjectionChallenge)
              }
            }
          })
        }
        if (utils.notSolved(challenges.dbSchemaChallenge)) {
          let solved = true
          models.sequelize.query('SELECT sql FROM sqlite_master').then(([data]) => {
            const tableDefinitions = utils.queryResultToJson(data)
            if (tableDefinitions.data && tableDefinitions.data.length) {
              for (let i = 0; i < tableDefinitions.data.length; i++) {
                solved = solved && utils.containsOrEscaped(dataString, tableDefinitions.data[i].sql)
                if (!solved) {
                  break
                }
              }
              if (solved) {
                utils.solve(challenges.dbSchemaChallenge)
              }
            }
          })
        }
        for (let i = 0; i < products.length; i++) {
          products[i].name = req.__(products[i].name)
          products[i].description = req.__(products[i].description)
        }
        res.json(utils.queryResultToJson(products))
      }).catch(error => {
        next(error)
      })
  }
}
