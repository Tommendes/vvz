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

/*Importar Contas (fin_lancamentos x fin_contas)*/
UPDATE mygsoft.fin_lancamentos SET forma_pagto = 'BOLETO BANCARIO' WHERE forma_pagto IN('BOL BANCARIO','BOL BANC');
UPDATE mygsoft.fin_lancamentos SET forma_pagto = 'CAIXA PEQUENO' WHERE forma_pagto = 'CX. PEQ.';
UPDATE mygsoft.fin_lancamentos SET forma_pagto = 'CAIXA F FIXO' WHERE forma_pagto = 'C F FIXO';
UPDATE mygsoft.fin_lancamentos SET forma_pagto = 'DEB AUTOMATICO' WHERE forma_pagto = 'DEB AUT';
UPDATE mygsoft.fin_lancamentos SET forma_pagto = 'OUTROS' WHERE forma_pagto = '';
UPDATE mygsoft.fin_lancamentos SET forma_pagto = 'C C/C ITAU' WHERE forma_pagto IN('BANCO PERSONNAL','BANKLINE');
-- SELECT COUNT(forma_pagto), forma_pagto FROM mygsoft.fin_lancamentos GROUP BY forma_pagto ORDER BY forma_pagto;

/*Importar dados de tipos de contas existentes*/
SET FOREIGN_KEY_CHECKS = 0;
-- Limpar a tabela
TRUNCATE TABLE vivazul_bceaa5.fin_contas;
INSERT INTO vivazul_bceaa5.fin_contas (id,evento,created_at,updated_at,STATUS,id_empresa,conta_tipo,nome,id_fin_cad_bancos,agencia,agencia_dv,conta,conta_dv) 
(SELECT 0,1,NOW(),NULL,10,1,6,forma_pagto,NULL,NULL,NULL,NULL,NULL FROM mygsoft.fin_lancamentos WHERE forma_pagto IS NOT NULL AND LENGTH(TRIM(forma_pagto)) > 0 GROUP BY forma_pagto ORDER BY forma_pagto);
INSERT INTO vivazul_bceaa5.fin_contas (id,evento,created_at,updated_at,STATUS,id_empresa,conta_tipo,nome,id_fin_cad_bancos,agencia,agencia_dv,conta,conta_dv) 
(SELECT 0,1,NOW(),NULL,10,2,6,forma_pagto,NULL,NULL,NULL,NULL,NULL FROM mygsoft.fin_lancamentos WHERE forma_pagto IS NOT NULL AND LENGTH(TRIM(forma_pagto)) > 0 GROUP BY forma_pagto ORDER BY forma_pagto);
INSERT INTO vivazul_bceaa5.fin_contas (id,evento,created_at,updated_at,STATUS,id_empresa,conta_tipo,nome,id_fin_cad_bancos,agencia,agencia_dv,conta,conta_dv) 
(SELECT 0,1,NOW(),NULL,10,3,6,forma_pagto,NULL,NULL,NULL,NULL,NULL FROM mygsoft.fin_lancamentos WHERE forma_pagto IS NOT NULL AND LENGTH(TRIM(forma_pagto)) > 0 GROUP BY forma_pagto ORDER BY forma_pagto);
INSERT INTO vivazul_bceaa5.fin_contas (id,evento,created_at,updated_at,STATUS,id_empresa,conta_tipo,nome,id_fin_cad_bancos,agencia,agencia_dv,conta,conta_dv) 
(SELECT 0,1,NOW(),NULL,10,4,6,forma_pagto,NULL,NULL,NULL,NULL,NULL FROM mygsoft.fin_lancamentos WHERE forma_pagto IS NOT NULL AND LENGTH(TRIM(forma_pagto)) > 0 GROUP BY forma_pagto ORDER BY forma_pagto);
SET FOREIGN_KEY_CHECKS = 1;

/*Importar Lancamentos (fin_lancamentos)*/
-- Eliminar lixo
DELETE FROM mygsoft.fin_lancamentos WHERE !(situacao >= 1 AND (valor_bruto < 0 OR valor_bruto > 0));

-- Totais
SELECT 'receita',COUNT(cod) FROM mygsoft.fin_lancamentos WHERE situacao >= 1 AND valor_bruto > 0
UNION ALL
SELECT 'despesa',COUNT(cod) FROM mygsoft.fin_lancamentos WHERE situacao >= 1 AND valor_bruto < 0
UNION ALL
SELECT 'total',COUNT(cod) FROM mygsoft.fin_lancamentos;

-- Importar lançamentos
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE vivazul_bceaa5.fin_lancamentos;
INSERT INTO vivazul_bceaa5.fin_lancamentos (id,evento,created_at,updated_at,STATUS,id_empresa,centro,tags,id_cadastros,data_emissao,valor_bruto,valor_liquido,pedido,descricao,old_id) 
(
	SELECT NULL,1,fl.data_lancamento,NULL updated_at,10 STATUS,fl.cod_sis_demp,IF(fl.valor_bruto > 0, 1, 2)centro,NULL tags,c.id,fl.data_lanc,fl.valor_bruto,fl.valor_liquido,NULL pedido,NULL descricao_conta,fl.cod
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
UPDATE vivazul_bceaa5.fin_lancamentos SET valor_bruto = valor_bruto * (-1) WHERE valor_bruto < 0;
UPDATE vivazul_bceaa5.fin_lancamentos SET valor_liquido = valor_liquido * (-1) WHERE valor_liquido < 0;	

-- CONSULTA: Registros sem referência de cadastro
SELECT /*cv.id,*/ c.estab, REPLACE(REPLACE(REPLACE(c.cpf_cnpj, '-', ''), '.', ''), '/', '') cpf_cnpj, fl.nota_fiscal_conta, fl.duplicata, fl.valor_bruto, fl.data_lanc, fl.data_vencimento, fl.data_pagto, fl.data_lancamento AS data_registro
FROM mygsoft.cadas c 
JOIN mygsoft.fin_lancamentos fl ON fl.cod_cadas = c.cod
JOIN vivazul_bceaa5.fin_lancamentos flv ON fl.cod = flv.old_id
-- join vivazul_bceaa5.cadastros cv on cv.cpf_cnpj = REPLACE(REPLACE(REPLACE(c.cpf_cnpj, '-', ''), '.', ''), '/', '')
WHERE flv.id_cadastros = 0
ORDER BY fl.data_vencimento DESC
LIMIT 99999;


/*Importar Parcelas (fin_lancamentos)*/
-- ATENÇÂO >>> Na importação, para cada registro em fin_lancamentos receberá um em fin_parcelas
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE vivazul_bceaa5.fin_parcelas;
INSERT INTO vivazul_bceaa5.fin_parcelas (id,evento,created_at,updated_at,STATUS,situacao,id_fin_lancamentos,data_vencimento,data_pagto,valor_vencimento,duplicata,parcela,recorrencia,descricao,documento,id_fin_contas,motivo_cancelamento)
(
	SELECT NULL,1,fl.data_lancamento,NULL updated_at,10 STATUS,
	IF(fl.situacao = 3, 2, IF(fl.situacao = 4, 3, IF(fl.situacao = 2, 99, fl.situacao))),
	flv.id,fl.data_vencimento,fl.data_pagto, fl.valor_bruto, fl.duplicata, fl.vencimento, 'U', fl.obs_da_conta, fl.doc_pagto,
	fc.id, fl.motiv_cancel
	FROM mygsoft.fin_lancamentos fl
	JOIN vivazul_bceaa5.fin_lancamentos flv ON flv.old_id = fl.cod
	JOIN vivazul_bceaa5.fin_contas fc ON fc.nome = fl.forma_pagto AND fc.id_empresa = flv.id_empresa	
);
-- Trocar valores negativos para positivos
UPDATE vivazul_bceaa5.fin_parcelas SET valor_vencimento = valor_vencimento * (-1) WHERE valor_vencimento < 0;	
SET FOREIGN_KEY_CHECKS = 1;

/*Inserir retenções*/
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE vivazul_bceaa5.fin_retencoes;
-- Trocar valores negativos para positivos
UPDATE mygsoft.fin_retencoes SET valor_retencao = valor_retencao * (-1) WHERE valor_retencao < 0;	
ALTER TABLE vivazul_bceaa5.fin_retencoes ADD COLUMN old_id INT(11) NULL;
INSERT INTO vivazul_bceaa5.fin_retencoes (id,evento,created_at,updated_at,STATUS,id_fin_lancamentos,valor_retencao,descricao,old_id) 
(SELECT 0, 1, NOW(), NULL, 10, fl.id, valor_retencao, 
IF (fr.tributo = fr.tributo_descricao, fr.tributo, CONCAT(fr.tributo, '. Descr adicional: ', fr.tributo_descricao)) descricao, fr.cod 
FROM mygsoft.fin_retencoes fr
JOIN vivazul_bceaa5.fin_lancamentos fl ON fl.old_id = fr.cod_fin_lancamentos
);
-- Consultar quantidade de linhas entre retenlçoes e lancamentos nos dois schemas
SELECT COUNT(*) FROM mygsoft.`fin_retencoes` fr
JOIN mygsoft.`fin_lancamentos` fl ON fl.cod = fr.`cod_fin_lancamentos`;
SELECT COUNT(*) FROM vivazul_bceaa5.`fin_retencoes` fr
JOIN vivazul_bceaa5.`fin_lancamentos` fl ON fl.id = fr.`id_fin_lancamentos`;

SET FOREIGN_KEY_CHECKS = 1;
/* Inserir os parâmetros do financeiro */
/* Isto foi substituído por contas de pagamento e depósito em fin_contas
INSERT INTO vivazul_bceaa5.local_params (id,evento,created_at,updated_at,STATUS,grupo,parametro,label) 
(SELECT 0,1,NOW(),NULL,10,'forma_pagto' grupo,forma_pagto,forma_pagto FROM mygsoft.fin_lancamentos WHERE forma_pagto IS NOT NULL AND LENGTH(TRIM(forma_pagto)) <> 0 GROUP BY forma_pagto ORDER BY forma_pagto);

SELECT COUNT(forma_pagto), forma_pagto FROM mygsoft.fin_lancamentos GROUP BY forma_pagto ORDER BY forma_pagto
*/

SELECT COUNT(cod) FROM `fin_retencoes` WHERE tributo = tributo_descricao