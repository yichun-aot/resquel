INSERT INTO test.dbo.customers (firstName, lastName, email) VALUES ('{{ data.firstName }}', '{{ data.lastName }}', '{{ data.email }}');
SELECT * FROM test.dbo.customers WHERE id=SCOPE_IDENTITY();