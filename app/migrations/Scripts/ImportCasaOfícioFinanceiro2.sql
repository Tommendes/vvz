ALTER TABLE vivazul_bceaa5.fin_lancamentos ADD COLUMN old_id INT(11) NULL;
ALTER TABLE mygsoft.fin_lancamentos CHANGE cod cod INT(10) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Código da conta de vencimento', CHANGE cod_cadas cod_cadas INT(10) UNSIGNED DEFAULT 0 NOT NULL COMMENT 'Codigo relacional com a tabela de cadastros'; 
ALTER TABLE mygsoft.fin_lancamentos CHARSET=utf8mb4, COLLATE=utf8mb4_general_ci;
ALTER TABLE vivazul_bceaa5.cadastros CHANGE old_id old_id INT(10) UNSIGNED NOT NULL, DROP PRIMARY KEY, ADD PRIMARY KEY (id, old_id);
UPDATE mygsoft.fin_lancamentos SET data_lancamento = '2015-12-22 10:59:50' WHERE cod = '26638'; 
UPDATE mygsoft.fin_lancamentos SET data_lancamento = '2016-01-11 02:34:14' WHERE cod = '26639'; 

/*Importar as empresas*/
ALTER TABLE vivazul_bceaa5.empresa ADD COLUMN old_id INT(11) NULL;
DELETE FROM vivazul_bceaa5.empresa WHERE id > 1;
ALTER TABLE vivazul_bceaa5.empresa AUTO_INCREMENT=0;
INSERT INTO vivazul_bceaa5.empresa (id,evento,created_at,updated_at,STATUS,razaosocial,fantasia,cpf_cnpj_empresa,ie,ie_st,im,cnae,cep,logradouro,nr,complnr,bairro,cidade,uf,ibge,geo_ltd,geo_lng,contato,tel1,tel2,
email,email_at,email_comercial,email_financeiro,email_rh,id_cadas_resplegal,id_uploads_logo,old_id) 
(SELECT 0,1,NOW(),NULL,10,de.razaosocial,de.fantasia,de.cnpj_empresa,de.ie,de.ie_st,de.im,de.CNAE,de.cep,de.logradouro,de.nr,de.complnr,de.bairro,de.municipio,de.ufabrev,NULL,NULL,NULL,de.contato,de.tel1,de.tel2,
de.email,de.emailAt,de.emailComercial,de.emailFinanceiro,NULL,NULL,NULL,cod
 FROM mygsoft.sis_demp de WHERE cod > 1 GROUP BY cnpj_empresa ORDER BY cnpj_empresa);
UPDATE vivazul_bceaa5.empresa SET old_id = id WHERE id = 1;

/*Importar o financeiro*/
-- Eliminar lixo
DELETE FROM mygsoft.fin_lancamentos WHERE !(situacao >= 1 AND (valor_bruto < 0 OR valor_bruto > 0));

-- Totais
SELECT 'receita',COUNT(cod) FROM mygsoft.fin_lancamentos WHERE situacao >= 1 AND valor_bruto > 0
UNION ALL
SELECT 'despesa',COUNT(cod) FROM mygsoft.fin_lancamentos WHERE situacao >= 1 AND valor_bruto < 0
UNION ALL
SELECT 'total',COUNT(cod) FROM mygsoft.fin_lancamentos;

-- Importar
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE vivazul_bceaa5.fin_lancamentos;
INSERT INTO vivazul_bceaa5.fin_lancamentos (id,evento,created_at,updated_at,STATUS,id_empresa,centro,tags,id_cadastros,data_emissao,valor_bruto,valor_liquido,pedido,descricao,old_id) 
(
	SELECT NULL,1,fl.data_lancamento,NULL updated_at,10 STATUS,fl.cod_sis_demp,IF(fl.valor_bruto > 0, 1, 2)centro,NULL tags,c.id,fl.data_lanc,0 valor_bruto,0 valor_liquido,NULL pedido,NULL descricao_conta,fl.cod
	FROM mygsoft.fin_lancamentos fl 
	LEFT JOIN vivazul_bceaa5.cadastros c ON c.old_id = fl.cod_cadas
	WHERE fl.situacao >= 1 AND (fl.valor_bruto < 0 OR fl.valor_bruto > 0)
	GROUP BY fl.cod
	ORDER BY DATE(fl.data_lanc)
);
SET FOREIGN_KEY_CHECKS = 1;
UPDATE vivazul_bceaa5.fin_lancamentos flv
JOIN mygsoft.fin_lancamentos fl ON fl.cod = flv.old_id
JOIN mygsoft.cadas c ON fl.cod_cadas = c.cod
JOIN vivazul_bceaa5.cadastros cv ON cv.cpf_cnpj = REPLACE(REPLACE(REPLACE(c.cpf_cnpj, '-', ''), '.', ''), '/', '')
SET flv.id_cadastros = cv.id
WHERE flv.id_cadastros = 0;

-- Registros sem referência de cadastro
SELECT /*cv.id,*/ c.estab, REPLACE(REPLACE(REPLACE(c.cpf_cnpj, '-', ''), '.', ''), '/', '') cpf_cnpj, fl.nota_fiscal_conta, fl.duplicata, fl.valor_bruto, fl.data_lanc, fl.data_vencimento, fl.data_pagto, fl.data_lancamento AS data_registro
FROM mygsoft.cadas c 
JOIN mygsoft.fin_lancamentos fl ON fl.cod_cadas = c.cod
JOIN vivazul_bceaa5.fin_lancamentos flv ON fl.cod = flv.old_id
-- join vivazul_bceaa5.cadastros cv on cv.cpf_cnpj = REPLACE(REPLACE(REPLACE(c.cpf_cnpj, '-', ''), '.', ''), '/', '')
WHERE flv.id_cadastros = 0
ORDER BY fl.data_vencimento DESC
LIMIT 99999;

SELECT nota_fiscal_conta, duplicata, valor_bruto, c.estab, data_lanc, data_vencimento, data_pagto, data_lancamento AS data_registro FROM mygsoft.fin_lancamentos fl
JOIN cadas c ON c.cod = fl.`cod_cadas`
WHERE data_lanc > NOW() ORDER BY data_lancamento;

/*
Inserir os parâmetros do financeiro
*/
INSERT INTO vivazul_bceaa5.local_params (id,evento,created_at,updated_at,STATUS,grupo,parametro,label) 
(SELECT 0,1,NOW(),NULL,10,'forma_pagto' grupo,forma_pagto,forma_pagto FROM mygsoft.fin_lancamentos WHERE forma_pagto IS NOT NULL AND LENGTH(TRIM(forma_pagto)) <> 0 GROUP BY forma_pagto ORDER BY forma_pagto);

SELECT COUNT(situacao), situacao FROM fin_lancamentos GROUP BY situacao ORDER BY situacao