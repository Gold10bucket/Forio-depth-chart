-- Seed roster — current Real Forio depth chart starting point.
-- Safe to re-run: clears the table first.

truncate table public.players;

insert into public.players (number, name, birth_year, position, depth_index) values
  ( 1, 'L. Santaniello', 2007, 'GK',  0),
  ( 2, 'F. Florio',      1996, 'RB',  0),
  ( 3, 'G. Ballirano',   2005, 'LB',  0),
  ( 8, 'S. Di Meglio',   2004, 'RCM', 0),
  (10, 'L. Iaccarino',   2006, 'LCM', 0);
