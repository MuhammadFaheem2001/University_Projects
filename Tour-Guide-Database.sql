-- Step 1: Create Database
CREATE DATABASE Tourism_db;
USE Tourism_db;

-- Step 2: Create Users Table
CREATE TABLE Users (
    user_id INT(11) PRIMARY KEY,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    created_at DATE,
    update_at DATE
);

-- Insert Users
INSERT INTO Users(user_id, first_name, last_name, email, password_hash, created_at, update_at)
VALUES
(1, "Muhammad", "Faheem", "faheem@gmail.com", "H5G7E8S4G5", "2022-05-25", "2025-06-12"),
(2, "Rizwan", "Zahid", "rizwan@gmail.com", "5H21F8E7H8", "2021-01-20", "2025-05-10"),
(3, "Daniyal", "Hussain", "daniyal@gmail.com", "GG48SGGFR58", "2018-01-20", "2022-12-12"),
(4, "Faizan", "Naeem", "faizan@gmail.com", "HRD4545D6H", "2014-03-02", "2020-09-11"),
(5, "Muhammad", "Faisal", "fasial@gmail.com", "FESF54H81HF", "2004-05-04", "2015-11-11"),
(6, "Fawad", "Kaka", "fawad@gmail.com", "GRDG1F248HAS", "2000-01-01", "2025-07-07");

-- Step 3: Create Guides Table
CREATE TABLE Guides (
    guide_id INT(11) PRIMARY KEY,
    bio VARCHAR(255),
    rating INT(11),
    created_at DATE,
    updated_at DATE,
    user_id INT,
    FOREIGN KEY(user_id) REFERENCES Users(user_id)
);

-- Insert Guides
INSERT INTO Guides (guide_id, bio, rating, created_at, updated_at, user_id)
VALUES
(1, "Experienced and passionate guide", 8, "2021-05-06", "2025-05-01", 3),
(2, "Dedicated to providing unforgettable", 7, "2020-05-01", "2022-11-12", 5),
(3, "Explore the world with me", 9, "2010-04-29", "2012-12-12", 4),
(4, "A certified guide with years of experience", 5, "2015-05-06", "2017-06-18", 1),
(5, "Ready to share my knowledge and passion", 6, "2013-01-25", "2014-08-12", 2),
(6, "Your guide to adventure. Explore with me!", 10, "2022-09-15", "2024-10-09", 6);

-- Step 4: Create Languages Table
CREATE TABLE Languages (
    language_id INT(11) PRIMARY KEY,
    lang_name VARCHAR(255),
    iso_code INT(11) UNIQUE
);

-- Insert Languages
INSERT INTO Languages(language_id, lang_name, iso_code)
VALUES
(1, "English", 1234),
(2, "Urdu", 4321),
(3, "Hindi", 3241),
(4, "Portugies", 2314),
(5, "German", 1324),
(6, "Hinco", 3124);

-- Step 5: Create Guide_Languages Table (M:N)
CREATE TABLE Guide_Languages (
    guide_id INT,
    language_id INT,
    FOREIGN KEY(guide_id) REFERENCES Guides(guide_id),
    FOREIGN KEY(language_id) REFERENCES Languages(language_id)
);

-- Insert Guide Languages
INSERT INTO Guide_Languages(guide_id, language_id)
VALUES
(1, 3),
(2, 6),
(3, 1),
(4, 5),
(5, 4),
(6, 2);

-- Index for Language Lookup
CREATE INDEX idx_language_id ON Guide_Languages(language_id);

-- Step 6: Create Locations Table
CREATE TABLE Locations (
    location_id INT(11) PRIMARY KEY,
    city VARCHAR(255),
    country VARCHAR(255),
    latitude VARCHAR(255),
    longitude VARCHAR(255),
    description VARCHAR(10000)
);

-- Insert Locations
INSERT INTO Locations(location_id, city, country, latitude, longitude, description)
VALUES
(1, "Karachi", "Pakistan", "24.8607° N, 67.0011° E", "24.8607° N, 67.0011° E", "Karachi is the capital city of the province of Sindh, Pakistan."),
(2, "Hunza", "Pakistan", "36.3167° N, 74.6500° E", "36.3167° N, 74.6500° E", "The Hunza Valley is a mountainous valley in Gilgit-Baltistan."),
(3, "Lahore", "Pakistan", "31.5204° N, 74.3587° E", "31.5204° N, 74.3587° E", "Lahore is the capital of Punjab province."),
(4, "Berlin", "Germany", "52.5200° N, 13.4050° E", "52.5200° N, 13.4050° E", "Berlin, Germany’s capital, dates to the 13th century."),
(5, "Moscow", "Russia", "55.7569° N, 37.6151° E", "55.7569° N, 37.6151° E", "Moscow is the nation’s cosmopolitan capital."),
(6, "Islamabad", "Pakistan", "33.6996° N, 73.0362° E", "33.6996° N, 73.0362° E", "Islamabad is the capital city of Pakistan.");

-- Step 7: Create Tour Table
CREATE TABLE Tour (
    tour_id INT(11) PRIMARY KEY,
    title VARCHAR(255),
    guide_id INT,
    price INT(11),
    duration_days INT(11),
    created_at DATE,
    updated_at DATE,
    FOREIGN KEY(guide_id) REFERENCES Guides(guide_id)
);

-- Insert Tours
INSERT INTO Tour(tour_id, title, guide_id, price, duration_days, created_at, updated_at)
VALUES
(1, "Mardan", 6, 35000, 4, "2015-05-01", "2016-01-01"),
(2, "Muzafarabad", 5, 25000, 3, "2011-04-08", "2016-08-12"),
(3, "Muree", 4, 22000, 5, "2019-07-25", "2021-09-20"),
(4, "Karachi", 3, 70000, 10, "2022-09-20", "2023-05-08"),
(5, "Lahore", 2, 20000, 6, "2023-06-09", "2024-08-30"),
(6, "Neelum Valley", 1, 100000, 15, "2017-05-16", "2025-06-12");

-- Step 8: Create Tour_Locations Table (M:N)
CREATE TABLE Tour_Locations (
    tour_id INT,
    location_id INT,
    FOREIGN KEY(tour_id) REFERENCES Tour(tour_id),
    FOREIGN KEY(location_id) REFERENCES Locations(location_id)
);

-- Insert Tour Locations
INSERT INTO Tour_Locations(tour_id, location_id)
VALUES
(1, 5),
(2, 6),
(3, 2),
(4, 1),
(5, 3),
(6, 4);

-- Step 9: Create View for Public Tour Details
CREATE VIEW v_PublicTourDetails AS
SELECT Tour.title, Tour.price, Tour.duration_days, guides.rating, guides.user_id 
FROM Tour
JOIN guides ON Tour.guide_id = guides.guide_id;

-- Step 10: Create Bookings Table
CREATE TABLE Bookings (
    booking_id INT(11) PRIMARY KEY,
    user_id INT,
    tour_id INT,
    booking_date DATE,
    num_people INT(11),
    price INT(11),
    status VARCHAR(255),
    FOREIGN KEY(user_id) REFERENCES Users(user_id),
    FOREIGN KEY(tour_id) REFERENCES Tour(tour_id)
);

-- Insert Bookings
INSERT INTO Bookings(booking_id, user_id, tour_id, booking_date, num_people, price, status)
VALUES
(1, 6, 6, "2025-04-10", 4, 40000, "Approved"),
(2, 5, 1, "2025-01-01", 3, 35000, "Pending"),
(3, 4, 2, "2024-04-10", 5, 70000, "Approved"),
(4, 3, 4, "2023-08-15", 6, 90000, "Rejected"),
(5, 2, 3, "2022-05-25", 4, 40000, "Approved"),
(6, 1, 5, "2021-10-10", 1, 15000, "Rejected");

-- Step 11: Create Reviews Table
CREATE TABLE Reviews (
    review_id INT(11) PRIMARY KEY,
    booking_id INT,
    rating INT(11),
    comment VARCHAR(255),
    create_at DATE,
    FOREIGN KEY(booking_id) REFERENCES Bookings(booking_id)
);

-- Insert Reviews
INSERT INTO Reviews(review_id, booking_id, rating, comment, create_at)
VALUES
(1, 6, 8, "Nice Servies", "2025-01-15"),
(2, 5, 6, "Good Transport Service", "2024-05-04"),
(3, 4, 5, "Exellent", "2024-09-12"),
(4, 3, 10, "Very Good Services", "2024-12-14"),
(5, 2, 9, "Average Services", "2024-01-01"),
(6, 1, 3, "Bad Services", "2024-05-05");

-- Step 12: Indexes
CREATE INDEX booked_user ON Bookings(user_id, tour_id);
CREATE INDEX idx_booking_id ON Reviews(booking_id);

-- Step 13: User Roles & Permissions
CREATE USER 'admin'@'localhost' IDENTIFIED BY "admin";
CREATE USER 'Customer_t'@'localhost' IDENTIFIED BY "customer";
CREATE USER 'Tour_Guide'@'localhost' IDENTIFIED BY "guide";

GRANT ALL PRIVILEGES ON *.* TO 'admin'@'localhost' WITH GRANT OPTION;
GRANT SELECT, INSERT, UPDATE ON Tourism_db.* TO 'Tour_Guide'@'localhost';
GRANT SELECT ON Tourism_db.* TO 'Customer_t'@'localhost';
