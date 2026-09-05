-- Migration 009 to add supervisor column to turnos table
alter table turnos add column if not exists supervisor text;
