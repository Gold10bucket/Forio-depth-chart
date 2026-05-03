-- Add Federico Scaffidi and Mory Bamba to the shortlist.
-- Safe to run independently (no truncate).

insert into public.prospects
  (category, name, birth_date, birth_year, nationality, height_cm, foot, current_club, agent, minutes, profile_url)
values
('Punta centrale', 'Federico Scaffidi', '2001-09-21'::date, 2001, 'Italia', 185, 'destro', 'Trastevere', null, 1025, 'https://www.transfermarkt.it/federico-scaffidi/profil/spieler/538088'),
('Ala destra',     'Mory Bamba',        '2002-06-01'::date, 2002, 'Costa d''Avorio', 167, 'sinistro', 'Enna', null, 2177, 'https://www.transfermarkt.it/mory-bamba/profil/spieler/536455');
