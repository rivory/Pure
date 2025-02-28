CREATE DATABASE shopping_db;
\c shopping_db

CREATE TABLE customers (
    customer_id SERIAL PRIMARY KEY,          -- Unique identifier for customers
    first_name VARCHAR(100) NOT NULL,        -- First name of the customer
    last_name VARCHAR(100) NOT NULL,         -- Last name of the customer
    email VARCHAR(100) UNIQUE NOT NULL,      -- Email of the customer (unique)
    phone_number VARCHAR(15),                -- Optional phone number
    address VARCHAR(255)                     -- Optional address
);

-- Create the orders table
CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,             -- Unique identifier for each order
    customer_id INT REFERENCES customers(customer_id), -- Foreign key referencing customers
    order_date DATE NOT NULL,                -- Date when the order was placed
    total_amount DECIMAL(10, 2) NOT NULL,    -- Total amount of the order
    status VARCHAR(50) DEFAULT 'Pending'     -- Order status (e.g., 'Pending', 'Shipped', 'Delivered')
);

-- Create the order_items table
CREATE TABLE order_items (
    order_item_id SERIAL PRIMARY KEY,        -- Unique identifier for each order item
    order_id INT REFERENCES orders(order_id),  -- Foreign key referencing orders
    product_name VARCHAR(100) NOT NULL,      -- Name of the product in the order
    quantity INT NOT NULL,                   -- Quantity of the product in the order
    unit_price DECIMAL(10, 2) NOT NULL,      -- Price per unit of the product
    total_price DECIMAL(10, 2) NOT NULL      -- Total price for the item (quantity * unit_price)
);

INSERT INTO customers (first_name, last_name, email, phone_number, address)
VALUES
    ('John', 'Doe', 'john.doe@example.com', '123-456-7890', '123 Main St, Springfield, IL'),
    ('Jane', 'Smith', 'jane.smith@example.com', '987-654-3210', '456 Elm St, Springfield, IL'),
    ('Alice', 'Johnson', 'alice.johnson@example.com', '555-123-4567', '789 Oak St, Springfield, IL'),
    ('Bob', 'Brown', 'bob.brown@example.com', '555-987-6543', '101 Pine St, Springfield, IL');

INSERT INTO orders (customer_id, order_date, total_amount, status)
VALUES
    (1, '2025-02-01', 120.50, 'Shipped'),     -- Order for customer with ID 1 (John Doe)
    (2, '2025-02-03', 250.00, 'Pending'),     -- Order for customer with ID 2 (Jane Smith)
    (3, '2025-02-05', 90.00, 'Delivered'),    -- Order for customer with ID 3 (Alice Johnson)
    (4, '2025-02-07', 150.75, 'Shipped');     -- Order for customer with ID 4 (Bob Brown)

INSERT INTO order_items (order_id, product_name, quantity, unit_price, total_price)
VALUES
    (1, 'Laptop', 1, 100.00, 100.00),  -- Item in order 1 (Laptop, 1 quantity, $100)
    (1, 'Wireless Mouse', 1, 20.50, 20.50),  -- Item in order 1 (Mouse, 1 quantity, $20.50)
    (2, 'Smartphone', 2, 120.00, 240.00),  -- Item in order 2 (Smartphone, 2 quantity, $120 each)
    (3, 'Headphones', 1, 90.00, 90.00),  -- Item in order 3 (Headphones, 1 quantity, $90)
    (4, 'Tablet', 1, 150.75, 150.75);  -- Item in order 4 (Tablet, 1 quantity, $150.75)

\c postgres

CREATE DATABASE library_management;

\c library_management


-- Create the members table
CREATE TABLE members (
    member_id SERIAL PRIMARY KEY,            -- Unique identifier for each member
    first_name VARCHAR(100) NOT NULL,        -- First name of the member
    last_name VARCHAR(100) NOT NULL,         -- Last name of the member
    email VARCHAR(100) UNIQUE NOT NULL,      -- Email address of the member (unique)
    phone_number VARCHAR(15),                -- Optional phone number
    membership_date DATE NOT NULL            -- Date when the membership was created
);

-- Create the books table
CREATE TABLE books (
    book_id SERIAL PRIMARY KEY,              -- Unique identifier for each book
    title VARCHAR(255) NOT NULL,             -- Title of the book
    author VARCHAR(100) NOT NULL,            -- Author of the book
    genre VARCHAR(50),                       -- Genre of the book (e.g., Fiction, Non-fiction)
    published_date DATE,                     -- Date when the book was published
    available_copies INT NOT NULL            -- Number of copies available in the library
);

-- Create the loans table
CREATE TABLE loans (
    loan_id SERIAL PRIMARY KEY,              -- Unique identifier for each loan
    member_id INT REFERENCES members(member_id),  -- Foreign key referencing the member who borrowed the book
    book_id INT REFERENCES books(book_id),        -- Foreign key referencing the book that was borrowed
    loan_date DATE NOT NULL,                  -- Date when the book was borrowed
    return_date DATE                          -- Date when the book was returned (NULL if not returned)
);

INSERT INTO members (first_name, last_name, email, phone_number, membership_date)
VALUES
    ('Alice', 'Williams', 'alice.williams@example.com', '123-555-7890', '2025-01-10'),
    ('Bob', 'Johnson', 'bob.johnson@example.com', '987-555-6543', '2025-02-01'),
    ('Charlie', 'Brown', 'charlie.brown@example.com', '555-123-4567', '2024-11-15'),
    ('Diana', 'Smith', 'diana.smith@example.com', '555-987-1234', '2025-01-20');

INSERT INTO books (title, author, genre, published_date, available_copies)
VALUES
    ('The Great Gatsby', 'F. Scott Fitzgerald', 'Fiction', '1925-04-10', 5),
    ('1984', 'George Orwell', 'Dystopian', '1949-06-08', 3),
    ('To Kill a Mockingbird', 'Harper Lee', 'Fiction', '1960-07-11', 4),
    ('Moby Dick', 'Herman Melville', 'Adventure', '1851-10-18', 2);

INSERT INTO loans (member_id, book_id, loan_date, return_date)
VALUES
    (1, 1, '2025-02-01', NULL),  -- Alice borrowed "The Great Gatsby" on 2025-02-01 (not yet returned)
    (2, 3, '2025-02-05', NULL),  -- Bob borrowed "To Kill a Mockingbird" on 2025-02-05 (not yet returned)
    (3, 2, '2025-01-15', '2025-02-10'),  -- Charlie borrowed "1984" on 2025-01-15 and returned it on 2025-02-10
    (4, 4, '2025-02-07', NULL);  -- Diana borrowed "Moby Dick" on 2025-02-07 (not yet returned)

\c postgres

CREATE DATABASE student_json_blobs;

\c student_json_blobs

-- Create the students table with a JSON column
CREATE TABLE students (
    student_id SERIAL PRIMARY KEY,          -- Unique identifier for each student
    first_name VARCHAR(100) NOT NULL,       -- First name of the student
    last_name VARCHAR(100) NOT NULL,        -- Last name of the student
    email VARCHAR(100) UNIQUE NOT NULL,     -- Email address of the student (unique)
    date_of_birth DATE NOT NULL,            -- Date of birth of the student
    enrollment_date DATE NOT NULL,          -- Date when the student was enrolled
    student_profile JSONB                   -- JSONB column to store additional student details (e.g., extracurricular activities)
);

-- Create the courses table
CREATE TABLE courses (
    course_id SERIAL PRIMARY KEY,           -- Unique identifier for each course
    course_name VARCHAR(255) NOT NULL,      -- Name of the course
    instructor_name VARCHAR(100) NOT NULL,  -- Instructor for the course
    credits INT NOT NULL,                  -- Number of credits for the course
    course_code VARCHAR(20) UNIQUE NOT NULL  -- Unique course code (e.g., "CS101", "MATH201")
);

-- Create the enrollments table
CREATE TABLE enrollments (
    enrollment_id SERIAL PRIMARY KEY,      -- Unique identifier for each enrollment record
    student_id INT REFERENCES students(student_id), -- Foreign key referencing the student
    course_id INT REFERENCES courses(course_id),   -- Foreign key referencing the course
    enrollment_date DATE NOT NULL,          -- Date when the student enrolled in the course
    grade VARCHAR(2)                       -- Grade received (e.g., 'A', 'B', 'C', etc.)
);


INSERT INTO students (first_name, last_name, email, date_of_birth, enrollment_date, student_profile)
VALUES
    ('Alice', 'Taylor', 'alice.taylor@example.com', '2001-04-15', '2021-09-01', 
     '{"extracurriculars": ["Chess Club", "Debate Team"], "hobbies": ["Reading", "Traveling"], "notes": "Has shown interest in computer science."}'),
    ('Bob', 'Clark', 'bob.clark@example.com', '2000-11-22', '2020-09-01', 
     '{"extracurriculars": ["Football"], "hobbies": ["Gaming", "Photography"], "notes": "Excellent at physics."}'),
    ('Charlie', 'Davis', 'charlie.davis@example.com', '2002-03-30', '2022-09-01', 
     '{"extracurriculars": ["Music Club"], "hobbies": ["Reading", "Music"], "notes": "Great performance in math."}'),
    ('Diana', 'Evans', 'diana.evans@example.com', '2001-07-12', '2021-09-01', 
     '{"extracurriculars": ["Drama Club"], "hobbies": ["Painting", "Swimming"], "notes": "Has a passion for psychology."}');

INSERT INTO courses (course_name, instructor_name, credits, course_code)
VALUES
    ('Introduction to Computer Science', 'Dr. Jane Smith', 3, 'CS101'),
    ('Calculus I', 'Prof. Michael Johnson', 4, 'MATH101'),
    ('Physics for Engineers', 'Dr. Emily Davis', 3, 'PHYS101'),
    ('Introduction to Psychology', 'Dr. Robert Brown', 3, 'PSY101');


INSERT INTO enrollments (student_id, course_id, enrollment_date, grade)
VALUES
    (1, 1, '2021-09-01', 'A'),  -- Alice enrolled in "Introduction to Computer Science" (CS101)
    (1, 2, '2021-09-01', 'B'),  -- Alice enrolled in "Calculus I" (MATH101)
    (2, 1, '2020-09-01', 'A'),  -- Bob enrolled in "Introduction to Computer Science" (CS101)
    (2, 3, '2020-09-01', 'B+'), -- Bob enrolled in "Physics for Engineers" (PHYS101)
    (3, 4, '2022-09-01', 'A'),  -- Charlie enrolled in "Introduction to Psychology" (PSY101)
    (4, 2, '2021-09-01', 'C'),  -- Diana enrolled in "Calculus I" (MATH101)
    (4, 3, '2021-09-01', 'B');  -- Diana enrolled in "Physics for Engineers" (PHYS101)
