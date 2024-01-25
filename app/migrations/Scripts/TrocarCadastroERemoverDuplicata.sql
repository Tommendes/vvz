SET @novo = 32790;
SET @velho = 380;

UPDATE vivazul_bceaa5.cad_enderecos SET id_cadastros = @novo WHERE id_cadastros = @velho;
UPDATE vivazul_bceaa5.cad_contatos SET id_cadastros = @novo WHERE id_cadastros = @velho;
UPDATE vivazul_bceaa5.pipeline SET id_cadastros = @novo WHERE id_cadastros = @velho;
UPDATE vivazul_bceaa5.pv SET id_cadastros = @novo WHERE id_cadastros = @velho;
UPDATE vivazul_bceaa5.com_prospeccoes SET id_cadastros = @novo WHERE id_cadastros = @velho;
UPDATE vivazul_bceaa5.cadastros SET STATUS = 99 WHERE id = @velho;