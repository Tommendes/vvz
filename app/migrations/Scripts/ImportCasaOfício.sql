/*Recriar tabelas*/
DELETE FROM vivazul_api.knex_migrations WHERE id > 7;
ALTER TABLE vivazul_api.knex_migrations AUTO_INCREMENT=0;

/*Importar usuários*/
ALTER TABLE vivazul_api.users ADD COLUMN old_id INT(10) UNSIGNED NOT NULL;
SET FOREIGN_KEY_CHECKS=0; 
DELETE FROM vivazul_api.users WHERE admin != 2;
ALTER TABLE vivazul_api.users AUTO_INCREMENT=0;
ALTER TABLE vivazul_api.users DROP COLUMN IF EXISTS PASSWORD;
SET FOREIGN_KEY_CHECKS=1; 
INSERT INTO vivazul_api.users (
  id,evento,created_at,updated_at,STATUS,tkn_api,NAME,cpf,
  email,telefone,password_reset_token,cliente,dominio,admin,gestor,multiCliente,
  cadastros,pipeline,pv,comercial,fiscal,financeiro,comissoes,agente_v,agente_arq,agente_at,time_to_pas_expires,old_id
)(
SELECT 
  0,1,NOW(),NULL,STATUS,NULL,username,(SELECT FLOOR(RAND() * 9000000000 + 1000000000) AS numero_aleatorio),
  email,tel_contato,NULL,'cso','root',administrador,gestor,0, 
  cadastros,ged,0,comercial,0,financeiro,0,agente_comercial,agente_arq,agente_at,99999,id
FROM vivazul_lynkos.user WHERE dominio = 'casaoficio'-- AND username NOT LIKE '%tom mendes%'
);

/*Criação dos parâmetros (local_params) do cliente*/
/*Remove o tipo TESTE dentre as opções antes de inserir na tabela local_params*/
UPDATE vivazul_lynkos.cadastros SET tipo = NULL WHERE LOWER(tipo) IN ('teste');
/*Limpar a tabela local_params*/
SET FOREIGN_KEY_CHECKS=0; 
DELETE FROM vivazul_cso_root.local_params;
ALTER TABLE vivazul_cso_root.local_params AUTO_INCREMENT=0;
SET FOREIGN_KEY_CHECKS=1; 
/*tipo_cadastro*/
INSERT INTO vivazul_cso_root.local_params (
  id,evento,created_at,updated_at,STATUS,grupo,parametro,label
) (SELECT 0,1,NOW(),NULL,10,'tipo_cadastro',tipo,tipo FROM vivazul_lynkos.cadastros 
	WHERE LENGTH(TRIM(tipo)) > 0 AND tipo IS NOT NULL GROUP BY tipo ORDER BY tipo);
/*id_atuacao*/
INSERT INTO vivazul_cso_root.local_params (
  id,evento,created_at,updated_at,STATUS,grupo,parametro,label
) (SELECT 0,1,NOW(),NULL,10,'id_atuacao',label,label FROM vivazul_lynkos.params 
	WHERE grupo = 'catu' AND LENGTH(TRIM(parametro)) > 0 AND parametro IS NOT NULL GROUP BY parametro ORDER BY parametro);
/*tipo_contato*/
INSERT INTO vivazul_cso_root.local_params (
  id,evento,created_at,updated_at,STATUS,grupo,parametro,label
) VALUES (0,1,NOW(),NULL,10,"tipo_contato","CELULAR","CELULAR"),(0,1,NOW(),NULL,10,"tipo_contato","CLARO","CLARO"),
(0,1,NOW(),NULL,10,"tipo_contato","EMAIL","EMAIL"),(0,1,NOW(),NULL,10,"tipo_contato","FAX","FAX"),
(0,1,NOW(),NULL,10,"tipo_contato","NEXTEL","NEXTEL"),(0,1,NOW(),NULL,10,"tipo_contato","OI","OI"),
(0,1,NOW(),NULL,10,"tipo_contato","OUTROS","OUTROS"),(0,1,NOW(),NULL,10,"tipo_contato","SITE","SITE"),
(0,1,NOW(),NULL,10,"tipo_contato","TELEFONE","TELEFONE"),(0,1,NOW(),NULL,10,"tipo_contato","TIM","TIM"),
(0,1,NOW(),NULL,10,"tipo_contato","VIVO","VIVO");
/*tipo_endereco*/
INSERT INTO vivazul_cso_root.local_params (
  id,evento,created_at,updated_at,STATUS,grupo,parametro,label
)(SELECT  0,1,NOW(),NULL,10,'tipo_endereco',tipo,tipo FROM vivazul_lynkos.cadastros_enderecos ce WHERE tipo IS NOT NULL GROUP BY tipo ORDER BY tipo);

/*Adiciona coluna de referência entre BDs*/
ALTER TABLE vivazul_cso_root.cadastros ADD COLUMN old_id INT(10) UNSIGNED NOT NULL;
/*Remover duplicatas em cadastros. Executar até o resultado da execução ser igual a zero*/
UPDATE vivazul_lynkos.cadastros SET dominio = CONCAT(dominio,'_XDEL'), STATUS = 99
WHERE id IN(SELECT id FROM vivazul_lynkos.cadastros 
WHERE STATUS = 10 AND dominio = 'casaoficio' AND LENGTH(cpf_cnpj) IN ('11','14')
GROUP BY cpf_cnpj 
HAVING COUNT(cpf_cnpj) > 1
ORDER BY cadas_nome,created_at);
/*Remove caracteres !d do field cpf_cnpj*/
UPDATE vivazul_lynkos.cadastros SET cpf_cnpj = NULL WHERE NOT(LENGTH(SUBSTRING_INDEX(SUBSTRING_INDEX(cpf_cnpj, '[^0-9]+', -1),'[^0-9]+',1)) IN ('11','14'));
/*Importa os cadastros*/
SET FOREIGN_KEY_CHECKS=0; 
DELETE FROM vivazul_cso_root.cadastros;
ALTER TABLE vivazul_cso_root.cadastros AUTO_INCREMENT=0;
SET FOREIGN_KEY_CHECKS=1; 
INSERT INTO vivazul_cso_root.cadastros (
  id,evento,created_at,updated_at,STATUS,prospect,
  id_params_tipo,
  id_params_atuacao,
  cpf_cnpj,rg_ie,nome,
  id_params_sexo,
  aniversario,id_params_p_nascto,observacao,
  telefone,email,inss,cim,doc_esp,old_id
) ( 
	SELECT 
	  0,1,FROM_UNIXTIME(created_at)created_at,updated_at,STATUS,
	  IF((SELECT COUNT(id) FROM vivazul_lynkos.ged WHERE id_cadastro = vivazul_lynkos.cadastros.id) > 0, 0, 1)prospect,
	  COALESCE((SELECT id FROM vivazul_cso_root.local_params WHERE parametro = tipo AND grupo = 'tipo_cadastro'),4)id_params_tipo,
	  COALESCE((SELECT id FROM vivazul_cso_root.local_params WHERE parametro = cadas_atuacao_id AND grupo = 'id_atuacao'),1)id_params_atuacao,
	  IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)cpf_cnpj,rg_ie,cadas_nome,
	  COALESCE((SELECT id FROM vivazul_api.params WHERE LOWER(label) = LOWER(sexo) AND meta = 'sexo'), 3)id_params_sexo,
	  aniversario,4,obs,
	  CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(COALESCE(telefone1,telefone2), '[^0-9]+', -1),'[^0-9]+',1) AS UNSIGNED)telefone,email,
	  inss,cim,doc_esp,id 
	FROM vivazul_lynkos.cadastros 
	WHERE STATUS = 10 AND dominio = 'casaoficio' AND cadas_nome IS NOT NULL AND LENGTH(TRIM(cadas_nome)) > 0
	GROUP BY IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
	ORDER BY created_at DESC, IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
	LIMIT 0, 9999999 
  ) ;
 /*Remover espaços extras em nomes de cadastros*/
 UPDATE cadastros SET nome = TRIM(nome);
/*Importa os contatos dos cadastros*/  
ALTER TABLE vivazul_cso_root.cad_contatos ADD COLUMN old_id INT(10) UNSIGNED NOT NULL;
SET FOREIGN_KEY_CHECKS=0; 
DELETE FROM vivazul_cso_root.cad_contatos;
ALTER TABLE vivazul_cso_root.cad_contatos AUTO_INCREMENT=0;
SET FOREIGN_KEY_CHECKS=1; 
INSERT INTO vivazul_cso_root.cad_contatos (
  id,evento,created_at,updated_at,STATUS,id_cadastros,
  id_params_tipo,pessoa,departamento,meio,observacao,old_id
)(
	SELECT 
	  0,1,FROM_UNIXTIME(o.created_at),FROM_UNIXTIME(o.updated_at),o.status,c.id,
	  lc.id,o.pessoa,o.departamento,o.contato,NULL,o.id
	FROM vivazul_lynkos.cadastros_ofc o
	JOIN vivazul_cso_root.cadastros c ON c.old_id = o.id_cadas
	JOIN vivazul_cso_root.local_params lc ON lc.label = o.tipo
	WHERE o.dominio = 'casaoficio' AND o.status = 10
) ;

/*Importa os endereços dos cadastros*/  
ALTER TABLE vivazul_cso_root.cad_enderecos ADD COLUMN old_id INT(10) UNSIGNED NOT NULL;
SET FOREIGN_KEY_CHECKS=0; 
DELETE FROM vivazul_cso_root.cad_enderecos;
ALTER TABLE vivazul_cso_root.cad_enderecos AUTO_INCREMENT=0;
SET FOREIGN_KEY_CHECKS=1; 
INSERT INTO vivazul_cso_root.cad_enderecos (
  id,evento,created_at,updated_at,STATUS,id_cadastros,
  id_params_tipo,cep,logradouro,nr,complnr,bairro,cidade,uf,ibge,geo_ltd,geo_lng,observacao,old_id
)(
	SELECT 
	0,1,FROM_UNIXTIME(ce.created_at),FROM_UNIXTIME(ce.updated_at),ce.status,c.id,
	lc.id,LPAD(REPLACE(REPLACE(TRIM(ce.cep),'-',''),'.',''),8,'0')cep,ce.logradouro,ce.nr,ce.complnr,ce.bairro,ce.cidade,ce.uf,ce.ibge,ce.geo_ltd,ce.geo_lng,NULL,ce.id 
	FROM vivazul_lynkos.cadastros_enderecos ce
	JOIN vivazul_cso_root.cadastros c ON c.old_id = ce.id_cadas
	JOIN vivazul_cso_root.local_params lc ON lc.label = ce.tipo
	WHERE ce.dominio = 'casaoficio' AND ce.status = 10
);

/*Importar empresa*/
SET FOREIGN_KEY_CHECKS=0; 
DELETE FROM vivazul_cso_root.empresa;
ALTER TABLE vivazul_cso_root.empresa AUTO_INCREMENT=0;
SET FOREIGN_KEY_CHECKS=1; 
INSERT INTO vivazul_cso_root.empresa (
  id,evento,created_at,updated_at,STATUS,razaosocial,
  fantasia,cpf_cnpj_empresa,ie,ie_st,im,cnae,cep,logradouro,nr,complnr,bairro,cidade,uf,ibge,geo_ltd,geo_lng,contato,tel1,tel2,email,email_at,email_comercial,email_financeiro,email_rh,
  id_cadas_resplegal,url_logo
)(
SELECT 
NULL,1,FROM_UNIXTIME(e.created_at)created_at,FROM_UNIXTIME(e.updated_at)updated_at,10,razaosocial,
fantasia,cpf_cnpj_empresa,ie,ie_st,im,cnae,cep,logradouro,nr,complnr,bairro,cidade,uf,ibge,geo_ltd,geo_lng,contato,tel1,tel2,email,emailat,emailcomercial,emailfinanceiro,emailrh,
(SELECT id FROM vivazul_cso_root.cadastros c WHERE c.old_id = e.id_cadas_resplegal)id_cadas_resplegal,url_logo 
FROM vivazul_lynkos.empresa e WHERE e.dominio = 'casaoficio' 
  );
  
/*Importa os documentos(ged_params x pipeline_params)*/
ALTER TABLE vivazul_cso_root.pipeline_params ADD COLUMN old_id INT(10) UNSIGNED NOT NULL;
UPDATE vivazul_lynkos.ged_params gp SET gp.tipo_secundario = NULL WHERE gp.tipo_secundario = 0;
SET FOREIGN_KEY_CHECKS=0; 
DELETE FROM vivazul_cso_root.pipeline_params;
ALTER TABLE vivazul_cso_root.pipeline_params AUTO_INCREMENT=0;
SET FOREIGN_KEY_CHECKS=1; 
INSERT INTO vivazul_cso_root.pipeline_params (
  evento,created_at,updated_at,STATUS,descricao,bi_index,doc_venda,autom_nr,gera_baixa,tipo_secundario,obrig_valor,reg_agente,id_logo,gera_pasta,proposta_interna,old_id
)(
	SELECT 1,NOW(),NULL,STATUS,descricao,bi_index,doc_venda,autom_nr,gera_baixa,tipo_secundario,obrig_valor,reg_agente,id_logo,gera_pasta,proposta_interna,id 
	FROM vivazul_lynkos.ged_params
	WHERE dominio = 'casaoficio'
	ORDER BY descricao
  );
/*Garante o tipo_secundário de acordo com id_old*/
UPDATE vivazul_cso_root.pipeline_params pp SET
	pp.tipo_secundario = (SELECT gp.id FROM vivazul_cso_root.pipeline_params gp WHERE gp.old_id = pp.tipo_secundario);

/*Importa os documentos(ged x pipeline)*/
ALTER TABLE vivazul_cso_root.pipeline ADD COLUMN old_id INT(10) UNSIGNED NOT NULL;
SET FOREIGN_KEY_CHECKS=0; 
DELETE FROM vivazul_cso_root.pipeline;
ALTER TABLE vivazul_cso_root.pipeline AUTO_INCREMENT=0;
SET FOREIGN_KEY_CHECKS=1; 
INSERT INTO vivazul_cso_root.pipeline (
  id,evento,created_at,updated_at,STATUS,
  id_pipeline_params,
  id_pai,id_filho,
  id_cadastros,
  id_com_agentes,
  status_comissao,documento,versao,descricao,valor_bruto,valor_liq,valor_representacao,perc_represent,valor_agente,old_id
)(
	SELECT 
	  NULL,1,FROM_UNIXTIME(g.created_at)created_at,FROM_UNIXTIME(g.updated_at)updated_at,g.status,
	  pp.id id_pipeline_params,
	  id_ged_pai,id_ged_filho, /*Executar edição num próximo update*/
	  c.id id_cadastro,
	  u.id id_usuario_agente_vendas,
	  0,IF(pp.doc_venda = 2,LPAD(g.documento_baixa,6,'0'),LPAD(g.documento,6,'0'))documento,g.versao,g.descricao,g.valor_bruto,g.valor_liq,g.valor_representacao,g.perc_represent,g.valor_agente,g.id
	FROM
	  vivazul_lynkos.ged g 
	JOIN vivazul_cso_root.pipeline_params pp ON g.id_ged_params = pp.old_id
	JOIN vivazul_cso_root.cadastros c ON g.id_cadastro = c.old_id
	LEFT JOIN vivazul_api.users u ON g.id_usuario_agente_vendas = u.old_id
	WHERE g.dominio = 'casaoficio' AND (CAST(g.documento_baixa AS INT) > 0 OR CAST(g.documento AS INT) > 0) AND g.status < 99 ORDER BY g.created_at -- LIMIT 250
);
/*
Edita a data de criação do registro para primeira data a partir de 2000-01-01 apenas dos registros com 
data de criação anterior a 2000-01-01
*/
UPDATE vivazul_cso_root.pipeline SET created_at = (SELECT MIN(created_at) FROM vivazul_cso_root.pipeline WHERE created_at > '2000-01-01') WHERE created_at < '2000-01-01';
/*Garantir id_pai e id_filho em pipeline*/
UPDATE vivazul_cso_root.pipeline pd
SET pd.id_pai = NULL WHERE pd.id_pai = 0;
UPDATE vivazul_cso_root.pipeline pd
SET pd.id_filho = NULL WHERE pd.id_filho = 0;

UPDATE vivazul_cso_root.pipeline pd
JOIN vivazul_cso_root.pipeline po ON pd.id_pai = po.old_id
SET pd.id_pai = po.id
WHERE pd.id_pai IS NOT NULL;

UPDATE vivazul_cso_root.pipeline pd
JOIN vivazul_cso_root.pipeline po ON pd.id_filho = po.old_id
SET pd.id_filho = po.id
WHERE pd.id_filho IS NOT NULL;

/*Importar os status(ged_status x pipeline_status)*/
SET FOREIGN_KEY_CHECKS=0; 
DELETE FROM vivazul_cso_root.pipeline_status;
ALTER TABLE vivazul_cso_root.pipeline_status AUTO_INCREMENT=0;
SET FOREIGN_KEY_CHECKS=1; 
INSERT INTO vivazul_cso_root.pipeline_status (
  id,evento,created_at,updated_at,STATUS,id_pipeline,status_params
)(
	SELECT 
	NULL,1,g.data_status created_at,FROM_UNIXTIME(g.updated_at)updated_at,10,p.id,g.status_params
	FROM vivazul_lynkos.ged_status g
	JOIN vivazul_cso_root.pipeline p ON g.id_ged = p.old_id ORDER BY g.created_at
);
/*Garantir data do status em pipeline_status*/
UPDATE vivazul_cso_root.pipeline_status ps
JOIN vivazul_cso_root.pipeline p ON p.id = ps.id_pipeline
SET ps.created_at = p.created_at
WHERE ps.created_at NOT LIKE '20%' LIMIT 9999999;
UPDATE vivazul_cso_root.pipeline_status ps
JOIN vivazul_cso_root.pipeline p ON p.id = ps.id_pipeline
SET ps.updated_at = p.created_at
WHERE ps.updated_at NOT LIKE '20%' LIMIT 9999999;

/*Importar prospecções*/
ALTER TABLE vivazul_cso_root.com_prospeccoes ADD COLUMN old_id INT(10) UNSIGNED NOT NULL;
SET FOREIGN_KEY_CHECKS=0; 
DELETE FROM vivazul_cso_root.com_prospeccoes;
ALTER TABLE vivazul_cso_root.com_prospeccoes AUTO_INCREMENT=0;
SET FOREIGN_KEY_CHECKS=1; 
INSERT INTO vivazul_cso_root.com_prospeccoes (
  id,evento,created_at,updated_at,STATUS,
  id_agente,id_cadastros,id_cad_end,
  periodo,pessoa,contato,observacoes,data_visita,old_id
)(
	SELECT 
	NULL,1,FROM_UNIXTIME(cp.created_at)created_at,FROM_UNIXTIME(cp.updated_at)updated_at,10,
	u.id id_agente,	c.id id_cadas,	ce.id id_cadas_end,
	periodo,pessoa,contato,observacoes,data_visita,cp.id
	FROM vivazul_lynkos.com_prospeccao cp
	JOIN vivazul_api.users u ON u.old_id = cp.id_agente
	JOIN vivazul_cso_root.cadastros c ON c.old_id = cp.id_cadas
	JOIN vivazul_cso_root.cad_enderecos ce ON ce.id_cadastros = c.id AND ce.old_id = cp.id_cadas_end
	WHERE cp.dominio = 'casaoficio' AND cp.status = 10 AND cp.data_visita LIKE '20%' ORDER BY CAST(cp.data_visita AS DATE) LIMIT 999999
  ) ;
  
/*Importar pv*/
ALTER TABLE vivazul_cso_root.pv ADD COLUMN old_id INT(10) UNSIGNED NOT NULL;
SET FOREIGN_KEY_CHECKS=0; 
DELETE FROM vivazul_cso_root.pv;
ALTER TABLE vivazul_cso_root.pv AUTO_INCREMENT=0;
SET FOREIGN_KEY_CHECKS=1; 
INSERT INTO vivazul_cso_root.pv (evento,created_at,updated_at,STATUS,id_cadastros,id_pipeline,tipo,pv_nr,observacao,old_id
)(
	SELECT 1,FROM_UNIXTIME(pv.created_at)created_at,FROM_UNIXTIME(pv.updated_at)updated_at,pv.status,
	c.id id_cadastro,p.id id_pipeline, -- p.old_id id_ged,
	IF(pv.motivo = 10,2,IF(pv.motivo = 30,1,0))tipo,LPAD(pv.pv_nr, 6, '0')pv_nr,pv.obs,pv.id FROM vivazul_lynkos.pv pv
	JOIN vivazul_cso_root.cadastros c ON c.old_id = pv.id_cadastro
	LEFT JOIN vivazul_cso_root.pipeline p ON p.old_id = pv.id_ged
	WHERE vivazul_lynkos.pv.dominio = 'casaoficio' 
); 
  
/*Importar pv_oat*/
ALTER TABLE vivazul_cso_root.pv_oat ADD COLUMN old_id INT(10) UNSIGNED NOT NULL;
SET FOREIGN_KEY_CHECKS=0; 
DELETE FROM vivazul_cso_root.pv_oat;
ALTER TABLE vivazul_cso_root.pv_oat AUTO_INCREMENT=0;
SET FOREIGN_KEY_CHECKS=1;
INSERT INTO vivazul_cso_root.pv_oat (evento,created_at,updated_at,STATUS,id_pv,
id_cadastro_endereco,id_tecnico,nr_oat,int_ext,garantia,nf_garantia,pessoa_contato,telefone_contato,
email_contato,descricao,valor_total,aceite_do_cliente,old_id
)(
	SELECT 1,FROM_UNIXTIME(pvo.created_at)created_at,FROM_UNIXTIME(pvo.updated_at)updated_at,pvo.status,pv.id,
	ce.id id_cadastro_endereco,NULL,nr_oat,int_ext,garantia,nf_garantia,pessoa_contato,telefone_contato,
	email_contato,descricao,valortotal,aceitedocliente,pvo.id FROM vivazul_lynkos.pv_oat pvo
	JOIN vivazul_cso_root.cad_enderecos ce ON ce.old_id = pvo.id_cadastro_endereco
	JOIN vivazul_cso_root.pv pv ON pv.old_id = pvo.id_pv
); 

/*Importar pv_status*/
SET FOREIGN_KEY_CHECKS=0; 
DELETE FROM vivazul_cso_root.pv_status;
ALTER TABLE vivazul_cso_root.pv_status AUTO_INCREMENT=0;
SET FOREIGN_KEY_CHECKS=1;
INSERT INTO vivazul_cso_root.pv_status (evento,created_at,updated_at,STATUS,id_pv,status_pv
) (SELECT 1,created_at,NULL updated_at,10,pv.id,0 FROM vivazul_cso_root.pv pv);
INSERT INTO vivazul_cso_root.pv_status (evento,created_at,updated_at,STATUS,id_pv,status_pv
) (SELECT 1,NOW() created_at,NULL updated_at,10,pv.id,pv.status FROM vivazul_cso_root.pv pv);
UPDATE vivazul_cso_root.pv_status SET status_pv = 80 WHERE status_pv = 90;


