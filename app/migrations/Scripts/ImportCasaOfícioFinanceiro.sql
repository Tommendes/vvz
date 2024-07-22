/*Recriar tabelas*/
DELETE FROM vivazul_api.knex_migrations WHERE id >= 117;
ALTER TABLE vivazul_api.knex_migrations AUTO_INCREMENT=0;
SET FOREIGN_KEY_CHECKS=0; 
DROP TABLE IF EXISTS vivazul_bceaa5.fis_notas;
DROP TABLE IF EXISTS vivazul_bceaa5.fin_etiquetas;
DROP TABLE IF EXISTS vivazul_bceaa5.fin_cad_bancos;
DROP TABLE IF EXISTS vivazul_bceaa5.fin_contas;
DROP TABLE IF EXISTS vivazul_bceaa5.fin_conciliacao;
DROP TABLE IF EXISTS vivazul_bceaa5.fin_lancamentos;
DROP TABLE IF EXISTS vivazul_bceaa5.fin_retencoes;
SET FOREIGN_KEY_CHECKS=1; 

/* 
Rodar a API para criação das tabelas 
*/

/*
Inserir os parâmetros do financeiro
*/
INSERT INTO `vivazul_bceaa5`.`local_params` (`id`,`evento`,`created_at`,`updated_at`,`status`,`grupo`,`parametro`,`label`) 
(SELECT 0,1,NOW(),NULL,10,'forma_pagto',forma_pagto,forma_pagto FROM mygsoft.fin_lancamentos WHERE forma_pagto IS NOT NULL AND LENGTH(TRIM(forma_pagto)) <> 0 GROUP BY forma_pagto ORDER BY forma_pagto)
