Easily convert your SQL database into a REST API.
====================================================
This is a lightweight Express.js middleware library that is able to convert SQL databases into a REST API. This library also works
seamlessly with the [Form.io](https://form.io) platform where you can build Angular.js and React.js applications on top of your SQL database. Please go
to https://form.io to learn more.

**This library has been validated with Microsoft SQL Server, MySQL, and PostgreSQL.**

## How it works
--------------
This module works by assigning routes to specific queries, which you define, that are executed when the routes are triggered. For example,
lets say you have the following customer table.

**customer**
  - *firstName*
  - *lastName*
  - *email*

This library is able to convert this into the following REST API.

  - **GET**: `/customer` - Returns a list of all customers.
  - **GET**: `/customer/:customerId` - Returns a single customer
  - **POST**: `/customer` - Creates a new customer
  - **PUT**: `/customer/:customerId` - Updates a customer
  - **DELETE**: `/customer/:customerId` - Deletes a customer.

Please refer to the `example/` folder to see how example configurations to achieve the following.

# How to use
This library is pretty simple. You include it in your Express.js application like the following.

```
import Resquel from 'resquel';
import express from 'express';

// Create the Express.js application.
const app = express();

// Include the resquel library.
const resquel = new Resquel(config);
app.use(resquel.router);

// Listen to port 3000.
app.listen(3000);
```

## DB Configuration
-------------------
Please review [Knex documentation](http://knexjs.org/#Installation-client) for specific details on configuring the database connection. The paramaters are passed through to Knex, so all options that are valid there for your database server will work.


## Routes
------------

```
{
	"method": "get|post|put|delete|index",
	"endpoint": "/your/endpoint/:withParams",
	"query": "SELECT * FROM customer"
}
```

### Advanced Queries
The query property in routes can be provided in 3 forms:
1) Simple query
```
"query": "SELECT * FROM customer"
```
This is very limited in use, and mostly provided as shorthand

2) Multiple queries
```
"query": [
	"TRUNCATE customer",
	"SELECT * FROM customer"
]
```
When multiple queries are provided, only the return response from the last query appears in the reply

3) Prepared queries
```
"query": [
	[
		"UPDATE customer SET `firstName` = ?, `lastName` = ?, `email` = ? WHERE `id` = ?",
		"body.firstName",
		"body.lastName",
		"body.email",
		"params.customerId"
	],
	[
		"SELECT * FROM customer `id` = ?",
		"params.customerId"
	]
]
```
This is the true intended way to use the library. In the inner arrays, the first item **MUST** be the query. All subsequent items are substitution values for the `?` in the query in the format of object paths on the `req` object. All properties are accessible, including (but not limited to): `headers`, `params`, `query`, `body`.

If not all values required by the prepared query are available, then an error will be emitted and execution of queries on that route will be halted (if there are followup queries present).

**Note:** When using prepared queries, mixing in shorthand style queries will result in an error. Invalid example:
```
"query": [
	["DELETE FROM customer WHERE id=?", "params.customerId"],
	"SELECT COUNT(*) AS num FROM customer"
]
```

-----


Enjoy!

 - The Form.io Team
