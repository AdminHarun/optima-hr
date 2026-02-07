--
-- PostgreSQL database cluster dump
--

-- Started on 2025-11-22 20:14:57

\restrict y9RZcgUV14FpMHUxgrQuGg079xbbNiXj8ciNX2g7nAHhiNYr0LoS9fBicjlyhji

SET default_transaction_read_only = off;

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

--
-- Roles
--

CREATE ROLE postgres;
ALTER ROLE postgres WITH SUPERUSER INHERIT CREATEROLE CREATEDB LOGIN REPLICATION BYPASSRLS PASSWORD 'SCRAM-SHA-256$4096:XgdGczZTSuEWxrtdnoV0Ag==$Ex+WoDxE6t9NUu9A9WKBQzFqtg9KYHow7ji89yn94Po=:YfjUAQ9FVS+nHOqEnO7SUfCE32tvV82AA7hw0u/nbLM=';

--
-- User Configurations
--








\unrestrict y9RZcgUV14FpMHUxgrQuGg079xbbNiXj8ciNX2g7nAHhiNYr0LoS9fBicjlyhji

-- Completed on 2025-11-22 20:14:57

--
-- PostgreSQL database cluster dump complete
--

