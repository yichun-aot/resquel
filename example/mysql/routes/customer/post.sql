INSERT INTO customers (firstName, lastName, email) VALUES ('{{ data.firstName }}', '{{ data.lastName }}', '{{ data.email }}');
SELECT * FROM customers WHERE id=LAST_INSERT_ID();
