-- Create tables for CrownBeatz DJ Ticket Booking System

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create admins table
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create tickets table
CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    ticket_count INTEGER NOT NULL CHECK (ticket_count >= 1 AND ticket_count <= 10),
    amount DECIMAL(10, 2) NOT NULL,
    payment_id VARCHAR(255) NOT NULL UNIQUE,
    order_id VARCHAR(255) NOT NULL UNIQUE,
    qr_data TEXT NOT NULL,
    attendance BOOLEAN DEFAULT FALSE,
    booked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    checked_in_at TIMESTAMP WITH TIME ZONE
);

-- 4. Create attendance_logs table
CREATE TABLE IF NOT EXISTS attendance_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id VARCHAR(50) REFERENCES tickets(ticket_id) ON DELETE CASCADE,
    scanned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    admin_name VARCHAR(255) NOT NULL
);

-- 5. Indexes for optimization
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_id ON tickets(ticket_id);
CREATE INDEX IF NOT EXISTS idx_tickets_email ON tickets(email);
CREATE INDEX IF NOT EXISTS idx_tickets_phone ON tickets(phone);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_ticket_id ON attendance_logs(ticket_id);
