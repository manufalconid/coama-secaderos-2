-- Migration to add IP address column to tablets table
alter table tablets add column if not exists ip_tablet text;
