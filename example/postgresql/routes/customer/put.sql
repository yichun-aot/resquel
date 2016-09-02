UPDATE customers SET "firstName"='{{ data.firstName }}', "lastName"='{{ data.lastName }}', email='{{ data.email }}' WHERE id={{ params.customerId }} RETURNING *
