-- Escudo de cada equipo: foto subida (data URL) o escudo generado con su estilo y color secundario.
ALTER TABLE team ADD COLUMN logo VARCHAR(400000);
ALTER TABLE team ADD COLUMN color2 VARCHAR(7);
ALTER TABLE team ADD COLUMN crest_style INT DEFAULT 0 NOT NULL;
UPDATE team SET crest_style = MOD(id, 6);
UPDATE team SET color2 = '#F5C542' WHERE MOD(id, 3) = 0;
