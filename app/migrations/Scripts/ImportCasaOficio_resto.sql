/*Determinar o resto*/
SELECT orig.id FROM 
	(SELECT id FROM vivazul_lynkos_or.cadastros 
	WHERE STATUS = 10 AND dominio = 'casaoficio' AND cadas_nome IS NOT NULL AND LENGTH(TRIM(cadas_nome)) > 0
	ORDER BY created_at DESC, IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
	) orig
LEFT JOIN (SELECT id 
	FROM vivazul_lynkos.cadastros 
	WHERE STATUS = 10 AND dominio = 'casaoficio' AND cadas_nome IS NOT NULL AND LENGTH(TRIM(cadas_nome)) > 0
	GROUP BY IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
	ORDER BY created_at DESC, IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
	) vvz ON orig.id = vvz.id
WHERE vvz.id IS NULL;

SELECT orig.id FROM 
	(SELECT id FROM vivazul_lynkos_or.cadastros 
	WHERE STATUS = 10 AND dominio = 'casaoficio' AND cadas_nome IS NOT NULL AND LENGTH(TRIM(cadas_nome)) > 0
	ORDER BY created_at DESC, IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
	) orig
LEFT JOIN (SELECT old_id id FROM vivazul_bceaa5.cadastros) vvz ON orig.id = vvz.id
WHERE vvz.id IS NULL;

/*Desativar foreign checks*/
USE `vivazul_bceaa5`;
SET FOREIGN_KEY_CHECKS=0; 

/*Inserir registros de resto*/
INSERT INTO vivazul_bceaa5.cadastros (
  id,evento,created_at,updated_at,STATUS,prospecto,
  id_params_tipo,
  id_params_atuacao,
  cpf_cnpj,rg_ie,nome,
  id_params_sexo,
  aniversario,id_params_p_nascto,observacao,
  telefone,email,cim,doc_esp,old_id
) ( 
	SELECT 
	  0,1,FROM_UNIXTIME(created_at)created_at,updated_at,STATUS,
	  IF((SELECT COUNT(id) FROM vivazul_lynkos_or.ged WHERE id_cadastro = co.id) > 0, 0, 1)prospect,
	  COALESCE((SELECT id FROM vivazul_bceaa5.local_params WHERE parametro = tipo AND grupo = 'tipo_cadastro'),4)id_params_tipo,
	  COALESCE((SELECT id FROM vivazul_bceaa5.local_params WHERE parametro = cadas_atuacao_id AND grupo = 'id_atuacao'),1)id_params_atuacao,
	  IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)cpf_cnpj,rg_ie,cadas_nome,
	  COALESCE((SELECT id FROM vivazul_api.params WHERE LOWER(label) = LOWER(sexo) AND meta = 'sexo'), 3)id_params_sexo,
	  aniversario,4,obs,
	  REGEXP_REPLACE(COALESCE(telefone1,telefone2), '[^0-9]', '')telefone,email,
	  cim,doc_esp,id 
	FROM vivazul_lynkos_or.cadastros co
	WHERE co.id IN (SELECT orig.id FROM 
				(SELECT id FROM vivazul_lynkos_or.cadastros 
				WHERE STATUS = 10 AND dominio = 'casaoficio' AND cadas_nome IS NOT NULL AND LENGTH(TRIM(cadas_nome)) > 0
				ORDER BY created_at DESC, IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
				) orig
			LEFT JOIN (SELECT old_id id FROM vivazul_bceaa5.cadastros) vvz ON orig.id = vvz.id
			WHERE vvz.id IS NULL
	) 
  ) ;
 /*Remover espaços extras em nomes de cadastros*/
UPDATE vivazul_bceaa5.cadastros SET nome = TRIM(nome);
/*Importa os contatos dos cadastros*/  
INSERT INTO vivazul_bceaa5.cad_contatos (
  id,evento,created_at,updated_at,STATUS,id_cadastros,
  id_params_tipo,pessoa,departamento,meio,observacao,old_id
)(
	SELECT 
	  0,1,FROM_UNIXTIME(o.created_at),FROM_UNIXTIME(o.updated_at),o.status,c.id,
	  lc.id,o.pessoa,o.departamento,o.contato,NULL,o.id
	FROM vivazul_lynkos_or.cadastros_ofc o
	JOIN vivazul_bceaa5.cadastros c ON c.old_id = o.id_cadas
	LEFT JOIN vivazul_bceaa5.local_params lc ON lc.label = o.tipo
	WHERE o.status = 10 AND o.id_cadas IN (SELECT orig.id FROM 
			(SELECT id FROM vivazul_lynkos_or.cadastros 
			WHERE STATUS = 10 AND dominio = 'casaoficio' AND cadas_nome IS NOT NULL AND LENGTH(TRIM(cadas_nome)) > 0
			ORDER BY created_at DESC, IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
			) orig
		LEFT JOIN (SELECT id 
			FROM vivazul_lynkos.cadastros 
			WHERE STATUS = 10 AND dominio = 'casaoficio' AND cadas_nome IS NOT NULL AND LENGTH(TRIM(cadas_nome)) > 0
			GROUP BY IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
			ORDER BY created_at DESC, IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
			) vvz ON orig.id = vvz.id
		WHERE vvz.id IS NULL) 
) ;

/*Importa os endereços dos cadastros*/  
INSERT INTO vivazul_bceaa5.cad_enderecos (
  id,evento,created_at,updated_at,STATUS,id_cadastros,
  id_params_tipo,cep,logradouro,nr,complnr,bairro,cidade,uf,ibge,geo_ltd,geo_lng,observacao,old_id
)(
	SELECT 
	0,1,FROM_UNIXTIME(ce.created_at),FROM_UNIXTIME(ce.updated_at),ce.status,c.id,
	lc.id,LPAD(REPLACE(REPLACE(TRIM(ce.cep),'-',''),'.',''),8,'0')cep,ce.logradouro,ce.nr,ce.complnr,ce.bairro,ce.cidade,ce.uf,ce.ibge,ce.geo_ltd,ce.geo_lng,NULL,ce.id 
	FROM vivazul_lynkos.cadastros_enderecos ce
	JOIN vivazul_bceaa5.cadastros c ON c.old_id = ce.id_cadas
	JOIN vivazul_bceaa5.local_params lc ON lc.label = ce.tipo
	WHERE ce.status = 10 AND c.old_id IN (SELECT orig.id FROM 
			(SELECT id FROM vivazul_lynkos_or.cadastros 
			WHERE STATUS = 10 AND dominio = 'casaoficio' AND cadas_nome IS NOT NULL AND LENGTH(TRIM(cadas_nome)) > 0
			-- GROUP BY IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
			ORDER BY created_at DESC, IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
			) orig
		LEFT JOIN (SELECT id FROM vivazul_lynkos.cadastros 
			WHERE STATUS = 10 AND dominio = 'casaoficio' AND cadas_nome IS NOT NULL AND LENGTH(TRIM(cadas_nome)) > 0
			-- GROUP BY IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
			ORDER BY created_at DESC, IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
			) vvz ON orig.id = vvz.id
		WHERE vvz.id IS NULL)
);
-- Atualizar os cadastros para receber a primeira ocorrência de cad_enderecos
UPDATE cadastros c
JOIN (SELECT ce.id_cadastros,ce.id_params_tipo,ce.cep,ce.logradouro,ce.nr,ce.complnr,ce.bairro,ce.cidade,ce.uf,ce.geo_ltd,ce.geo_lng FROM cad_enderecos ce GROUP BY id_cadastros) AS ce ON ce.id_cadastros = c.id
SET 
c.id_params_tipo_end = ce.id_params_tipo,
c.cep = ce.cep,
c.logradouro = ce.logradouro,
c.nr = ce.nr,
c.complnr = ce.complnr,
c.bairro = ce.bairro,
c.cidade = ce.cidade,
c.uf = ce.uf,
c.geo_ltd = ce.geo_ltd,
c.geo_lng = ce.geo_lng; 

/*Importa os documentos(ged x pipeline)*/
INSERT INTO vivazul_bceaa5.pipeline (
  id,evento,created_at,updated_at,STATUS,
  id_pipeline_params,
  id_pai,id_filho,
  id_cadastros,
  id_com_agentes,
  status_comissao,documento,versao,descricao,valor_bruto,valor_liq,valor_representacao,perc_represent,valor_agente,old_id
)(
	SELECT 
	  NULL,1,g.data_registro created_at,NULL,g.status,
	  pp.id id_pipeline_params,
	  id_ged_pai,id_ged_filho, /*Executar edição num próximo update*/
	  c.id id_cadastro,
	  u.id id_usuario_agente_vendas,
	  0,IF(pp.doc_venda = 2,LPAD(g.documento_baixa,6,'0'),LPAD(g.documento,6,'0'))documento,g.versao,g.descricao,g.valor_bruto,g.valor_liq,g.valor_representacao,g.perc_represent,g.valor_agente,g.id
	FROM
	  vivazul_lynkos.ged g 
	JOIN vivazul_bceaa5.pipeline_params pp ON g.id_ged_params = pp.old_id
	JOIN vivazul_bceaa5.cadastros c ON g.id_cadastro = c.old_id
	LEFT JOIN vivazul_api.users u ON g.id_usuario_agente_vendas = u.old_id
	WHERE g.dominio = 'casaoficio' /*AND (CAST(g.documento_baixa AS INT) > 0 OR CAST(g.documento AS INT) > 0)*/ AND c.old_id IN (SELECT orig.id FROM 
			(SELECT id FROM vivazul_lynkos_or.cadastros 
			WHERE STATUS = 10 AND dominio = 'casaoficio' AND cadas_nome IS NOT NULL AND LENGTH(TRIM(cadas_nome)) > 0
			-- GROUP BY IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
			ORDER BY created_at DESC, IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
			) orig
		LEFT JOIN (SELECT id FROM vivazul_lynkos.cadastros 
			WHERE STATUS = 10 AND dominio = 'casaoficio' AND cadas_nome IS NOT NULL AND LENGTH(TRIM(cadas_nome)) > 0
			-- GROUP BY IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
			ORDER BY created_at DESC, IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
			) vvz ON orig.id = vvz.id
		WHERE vvz.id IS NULL)
);
/*
Edita a data de criação do registro para primeira data a partir de 2000-01-01 apenas dos registros com 
data de criação anterior a 2000-01-01
*/
UPDATE vivazul_bceaa5.pipeline SET created_at = (SELECT MIN(created_at) FROM vivazul_bceaa5.pipeline WHERE created_at > '2000-01-01') WHERE created_at < '2000-01-01';
/*Garantir id_pai e id_filho em pipeline*/
UPDATE vivazul_bceaa5.pipeline pd SET pd.id_pai = NULL WHERE pd.id_pai = 0;
UPDATE vivazul_bceaa5.pipeline pd SET pd.id_filho = NULL WHERE pd.id_filho = 0;

UPDATE vivazul_bceaa5.pipeline pd
JOIN vivazul_bceaa5.pipeline po ON pd.id_pai = po.old_id
SET pd.id_pai = po.id
WHERE pd.id_pai IS NOT NULL;

UPDATE vivazul_bceaa5.pipeline pd
JOIN vivazul_bceaa5.pipeline po ON pd.id_filho = po.old_id
SET pd.id_filho = po.id
WHERE pd.id_filho IS NOT NULL;

/*Utilizar para identificar diferenças de valores enter o ged e o pipeline
select p.updated_at, (select u.name from vivazul_api.users u JOIN vivazul_api.sis_events se ON u.id = se.id_user where se.id = p.evento order by se.id limit 1)name, p.id, g.valor_bruto, p.valor_bruto, g.valor_liq, p.valor_liq from vivazul_bceaa5.pipeline p
join vivazul_lynkos_or.ged g on g.id = p.old_id
where g.valor_bruto != p.valor_bruto or g.valor_liq != p.valor_liq;

UPDATE vivazul_bceaa5.pipeline p
JOIN vivazul_lynkos_or.ged g ON g.id = p.old_id
SET p.valor_bruto = g.valor_bruto
WHERE g.valor_bruto != p.valor_bruto;

UPDATE vivazul_bceaa5.pipeline p
JOIN vivazul_lynkos_or.ged g ON g.id = p.old_id
SET p.valor_liq = g.valor_liq
WHERE g.valor_liq != p.valor_liq;
*/

/*Importar os status(ged_status x pipeline_status)*/
INSERT INTO vivazul_bceaa5.pipeline_status (
  id,evento,created_at,updated_at,STATUS,id_pipeline,status_params
)(
	SELECT 
	NULL,1,g.data_status created_at,FROM_UNIXTIME(g.updated_at)updated_at,10,p.id,g.status_params
	FROM vivazul_lynkos.ged_status g
	JOIN vivazul_bceaa5.pipeline p ON g.id_ged = p.old_id 
	JOIN vivazul_bceaa5.cadastros c ON c.id = p.id_cadastros 
	WHERE c.old_id IN (SELECT orig.id FROM 
			(SELECT id FROM vivazul_lynkos_or.cadastros 
			WHERE STATUS = 10 AND dominio = 'casaoficio' AND cadas_nome IS NOT NULL AND LENGTH(TRIM(cadas_nome)) > 0
			-- GROUP BY IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
			ORDER BY created_at DESC, IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
			) orig
		LEFT JOIN (SELECT id FROM vivazul_lynkos.cadastros 
			WHERE STATUS = 10 AND dominio = 'casaoficio' AND cadas_nome IS NOT NULL AND LENGTH(TRIM(cadas_nome)) > 0
			-- GROUP BY IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
			ORDER BY created_at DESC, IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
			) vvz ON orig.id = vvz.id
		WHERE vvz.id IS NULL)	
	ORDER BY g.created_at
);
/*Garantir data do status em pipeline_status*/
UPDATE vivazul_bceaa5.pipeline_status ps
	JOIN vivazul_bceaa5.pipeline p ON p.id = ps.id_pipeline
	SET ps.created_at = p.created_at
	WHERE ps.created_at NOT LIKE '20%' LIMIT 9999999;
UPDATE vivazul_bceaa5.pipeline_status ps
	JOIN vivazul_bceaa5.pipeline p ON p.id = ps.id_pipeline
	SET ps.updated_at = p.created_at
	WHERE ps.updated_at NOT LIKE '20%' LIMIT 9999999;
/*Garantir que todos os pipeline tenham um pipeline_status*/
INSERT INTO vivazul_bceaa5.pipeline_status (
  id,evento,created_at,updated_at,STATUS,id_pipeline,status_params
)(
	SELECT NULL,1,p.created_at,NULL updated_at,10,p.id,0
	FROM vivazul_bceaa5.pipeline AS p  
	LEFT JOIN vivazul_bceaa5.pipeline_status AS ps ON ps.id_pipeline = p.id
	JOIN vivazul_bceaa5.cadastros c ON c.id = p.id_cadastros 
	WHERE ps.id IS NULL AND c.old_id IN (SELECT orig.id FROM 
			(SELECT id FROM vivazul_lynkos_or.cadastros 
			WHERE STATUS = 10 AND dominio = 'casaoficio' AND cadas_nome IS NOT NULL AND LENGTH(TRIM(cadas_nome)) > 0
			-- GROUP BY IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
			ORDER BY created_at DESC, IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
			) orig
		LEFT JOIN (SELECT id FROM vivazul_lynkos.cadastros 
			WHERE STATUS = 10 AND dominio = 'casaoficio' AND cadas_nome IS NOT NULL AND LENGTH(TRIM(cadas_nome)) > 0
			-- GROUP BY IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
			ORDER BY created_at DESC, IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
			) vvz ON orig.id = vvz.id
		WHERE vvz.id IS NULL)
);

/*Importar prospecções*/
INSERT INTO vivazul_bceaa5.com_prospeccoes (
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
	JOIN vivazul_bceaa5.cadastros c ON c.old_id = cp.id_cadas
	JOIN vivazul_bceaa5.cad_enderecos ce ON ce.id_cadastros = c.id AND ce.old_id = cp.id_cadas_end
	WHERE cp.dominio = 'casaoficio' AND cp.status = 10 AND cp.data_visita LIKE '20%' AND c.old_id IN (SELECT orig.id FROM 
			(SELECT id FROM vivazul_lynkos_or.cadastros 
			WHERE STATUS = 10 AND dominio = 'casaoficio' AND cadas_nome IS NOT NULL AND LENGTH(TRIM(cadas_nome)) > 0
			-- GROUP BY IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
			ORDER BY created_at DESC, IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
			) orig
		LEFT JOIN (SELECT id FROM vivazul_lynkos.cadastros 
			WHERE STATUS = 10 AND dominio = 'casaoficio' AND cadas_nome IS NOT NULL AND LENGTH(TRIM(cadas_nome)) > 0
			-- GROUP BY IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
			ORDER BY created_at DESC, IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
			) vvz ON orig.id = vvz.id
		WHERE vvz.id IS NULL)
		ORDER BY CAST(cp.data_visita AS DATE) LIMIT 999999
  ) ;
  
/*Importar pv*/
INSERT INTO vivazul_bceaa5.pv (evento,created_at,updated_at,STATUS,id_cadastros,id_pipeline,tipo,pv_nr,observacao,old_id
)(
	SELECT 1,FROM_UNIXTIME(pv.created_at)created_at,FROM_UNIXTIME(pv.updated_at)updated_at,pv.status,
	c.id id_cadastro,p.id id_pipeline, -- p.old_id id_ged,
	IF(pv.motivo = 10,2,IF(pv.motivo = 30,1,0))tipo,LPAD(pv.pv_nr, 6, '0')pv_nr,pv.obs,pv.id FROM vivazul_lynkos.pv pv
	JOIN vivazul_bceaa5.cadastros c ON c.old_id = pv.id_cadastro
	LEFT JOIN vivazul_bceaa5.pipeline p ON p.old_id = pv.id_ged
	WHERE vivazul_lynkos.pv.dominio = 'casaoficio' AND c.old_id IN (SELECT orig.id FROM 
			(SELECT id FROM vivazul_lynkos_or.cadastros 
			WHERE STATUS = 10 AND dominio = 'casaoficio' AND cadas_nome IS NOT NULL AND LENGTH(TRIM(cadas_nome)) > 0
			-- GROUP BY IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
			ORDER BY created_at DESC, IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
			) orig
		LEFT JOIN (SELECT id FROM vivazul_lynkos.cadastros 
			WHERE STATUS = 10 AND dominio = 'casaoficio' AND cadas_nome IS NOT NULL AND LENGTH(TRIM(cadas_nome)) > 0
			-- GROUP BY IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
			ORDER BY created_at DESC, IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
			) vvz ON orig.id = vvz.id
		WHERE vvz.id IS NULL)
); 
  
/*Importar pv_oat*/
INSERT INTO vivazul_bceaa5.pv_oat (evento,created_at,updated_at,STATUS,id_pv,
id_cadastro_endereco,id_tecnico,nr_oat,int_ext,garantia,nf_garantia,pessoa_contato,telefone_contato,
email_contato,descricao,valor_total,aceite_do_cliente,old_id
)(
	SELECT 1,FROM_UNIXTIME(pvo.created_at)created_at,FROM_UNIXTIME(pvo.updated_at)updated_at,pvo.status,pv.id,
	ce.id id_cadastro_endereco,NULL,nr_oat,int_ext,garantia,nf_garantia,pessoa_contato,telefone_contato,
	email_contato,descricao,valortotal,aceitedocliente,pvo.id FROM vivazul_lynkos.pv_oat pvo
	JOIN vivazul_bceaa5.cad_enderecos ce ON ce.old_id = pvo.id_cadastro_endereco
	JOIN vivazul_bceaa5.pv pv ON pv.old_id = pvo.id_pv
	JOIN vivazul_bceaa5.cadastros c ON c.id = ce.id_cadastros
	WHERE c.old_id IN (SELECT orig.id FROM 
			(SELECT id FROM vivazul_lynkos_or.cadastros 
			WHERE STATUS = 10 AND dominio = 'casaoficio' AND cadas_nome IS NOT NULL AND LENGTH(TRIM(cadas_nome)) > 0
			-- GROUP BY IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
			ORDER BY created_at DESC, IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
			) orig
		LEFT JOIN (SELECT id FROM vivazul_lynkos.cadastros 
			WHERE STATUS = 10 AND dominio = 'casaoficio' AND cadas_nome IS NOT NULL AND LENGTH(TRIM(cadas_nome)) > 0
			-- GROUP BY IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
			ORDER BY created_at DESC, IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
			) vvz ON orig.id = vvz.id
		WHERE vvz.id IS NULL)
);

/*Importar pv_status*/
INSERT INTO vivazul_bceaa5.pv_status (evento,created_at,updated_at,STATUS,id_pv,status_pv) (
	SELECT 1,pv.created_at,NULL updated_at,10,pv.id,0 FROM vivazul_bceaa5.pv pv
	JOIN vivazul_bceaa5.cadastros c ON c.id = pv.id_cadastros
	WHERE c.old_id IN (SELECT orig.id FROM 
			(SELECT id FROM vivazul_lynkos_or.cadastros 
			WHERE STATUS = 10 AND dominio = 'casaoficio' AND cadas_nome IS NOT NULL AND LENGTH(TRIM(cadas_nome)) > 0
			-- GROUP BY IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
			ORDER BY created_at DESC, IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
			) orig
		LEFT JOIN (SELECT id FROM vivazul_lynkos.cadastros 
			WHERE STATUS = 10 AND dominio = 'casaoficio' AND cadas_nome IS NOT NULL AND LENGTH(TRIM(cadas_nome)) > 0
			-- GROUP BY IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
			ORDER BY created_at DESC, IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
			) vvz ON orig.id = vvz.id
		WHERE vvz.id IS NULL)
);
INSERT INTO vivazul_bceaa5.pv_status (evento,created_at,updated_at,STATUS,id_pv,status_pv) (
	SELECT 1,NOW() created_at,NULL updated_at,10,pv.id,pv.status FROM vivazul_bceaa5.pv pv
	JOIN vivazul_bceaa5.cadastros c ON c.id = pv.id_cadastros
	WHERE c.old_id IN (SELECT orig.id FROM 
			(SELECT id FROM vivazul_lynkos_or.cadastros 
			WHERE STATUS = 10 AND dominio = 'casaoficio' AND cadas_nome IS NOT NULL AND LENGTH(TRIM(cadas_nome)) > 0
			-- GROUP BY IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
			ORDER BY created_at DESC, IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
			) orig
		LEFT JOIN (SELECT id FROM vivazul_lynkos.cadastros 
			WHERE STATUS = 10 AND dominio = 'casaoficio' AND cadas_nome IS NOT NULL AND LENGTH(TRIM(cadas_nome)) > 0
			-- GROUP BY IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
			ORDER BY created_at DESC, IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
			) vvz ON orig.id = vvz.id
		WHERE vvz.id IS NULL)
);
UPDATE vivazul_bceaa5.pv_status SET status_pv = 80 WHERE status_pv = 90;

/*Importar pv_oat_status*/
INSERT INTO vivazul_bceaa5.pv_oat_status (evento,created_at,updated_at,STATUS,id_pv_oat,status_pv_oat) (
	SELECT 1,oat.created_at,NULL updated_at,10,oat.id,oat.status FROM vivazul_bceaa5.pv_oat oat
	JOIN vivazul_bceaa5.pv pv ON pv.id = oat.id_pv
	JOIN vivazul_bceaa5.cadastros c ON c.id = pv.id_cadastros
	WHERE c.old_id IN (SELECT orig.id FROM 
			(SELECT id FROM vivazul_lynkos_or.cadastros 
			WHERE STATUS = 10 AND dominio = 'casaoficio' AND cadas_nome IS NOT NULL AND LENGTH(TRIM(cadas_nome)) > 0
			-- GROUP BY IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
			ORDER BY created_at DESC, IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
			) orig
		LEFT JOIN (SELECT id FROM vivazul_lynkos.cadastros 
			WHERE STATUS = 10 AND dominio = 'casaoficio' AND cadas_nome IS NOT NULL AND LENGTH(TRIM(cadas_nome)) > 0
			-- GROUP BY IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
			ORDER BY created_at DESC, IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
			) vvz ON orig.id = vvz.id
		WHERE vvz.id IS NULL)
);
UPDATE vivazul_bceaa5.pv_oat_status SET status_pv_oat = 98 WHERE status_pv_oat = 90;

/*Importar com_propostas*/
INSERT INTO vivazul_bceaa5.com_propostas (
  id,evento,created_at,updated_at,STATUS,id_pipeline,id_pv,
  pessoa_contato,telefone_contato,email_contato,
  saudacao_inicial,conclusao,garantia,desconto_ativo,desconto_total,
  observacoes_finais,prz_entrega,forma_pagto,validade_prop,assinatura,old_id
)(
	SELECT 0,1,NOW(),NULL,10,p.id,pv.id,
	pessoa_contato,REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(telefone_contato,' ',''),'(',''),')',''),'-',''),' ','')telefone_contato,email_contato,
	corpo_saudacao_inicial,corpo_conclusao,corpo_garantia,desconto_ativo,desconto_total,
	observacoes_finais,prz_entrega,forma_pagto,validade_prop,assinatura,prop.id
	FROM vivazul_lynkos.com_proposta prop
	JOIN vivazul_bceaa5.pipeline p ON p.old_id = prop.id_ged
	JOIN vivazul_bceaa5.cadastros c ON c.id = p.id_cadastros
	LEFT JOIN vivazul_bceaa5.pv ON pv.old_id = prop.id_pv
	WHERE prop.dominio = 'casaoficio' AND prop.status = 10 AND c.old_id IN (SELECT orig.id FROM 
			(SELECT id FROM vivazul_lynkos_or.cadastros 
			WHERE STATUS = 10 AND dominio = 'casaoficio' AND cadas_nome IS NOT NULL AND LENGTH(TRIM(cadas_nome)) > 0
			-- GROUP BY IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
			ORDER BY created_at DESC, IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
			) orig
		LEFT JOIN (SELECT id FROM vivazul_lynkos.cadastros 
			WHERE STATUS = 10 AND dominio = 'casaoficio' AND cadas_nome IS NOT NULL AND LENGTH(TRIM(cadas_nome)) > 0
			-- GROUP BY IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
			ORDER BY created_at DESC, IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
			) vvz ON orig.id = vvz.id
		WHERE vvz.id IS NULL)
);

/*Importar com_prop_compos*/
INSERT INTO vivazul_bceaa5.com_prop_compos (
  id,evento,created_at,updated_at,STATUS,
  id_com_propostas,comp_ativa,compoe_valor,ordem,compos_nr,localizacao,tombamento,old_id
)(
	SELECT 0,1,NOW(),NULL,10,
	cp.id id_com_proposta,compoe_valor,compoe_valor,ordem,compos_nr,localizacao,tombamento,co.id
	FROM vivazul_lynkos.com_proposta_compos co
	JOIN vivazul_bceaa5.com_propostas cp ON cp.old_id = co.id_com_proposta
	JOIN vivazul_bceaa5.pipeline p ON p.id = cp.id_pipeline
	JOIN vivazul_bceaa5.cadastros c ON c.id = p.id_cadastros
	WHERE co.dominio = 'casaoficio' AND co.status = 10 AND c.old_id IN (SELECT orig.id FROM 
			(SELECT id FROM vivazul_lynkos_or.cadastros 
			WHERE STATUS = 10 AND dominio = 'casaoficio' AND cadas_nome IS NOT NULL AND LENGTH(TRIM(cadas_nome)) > 0
			-- GROUP BY IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
			ORDER BY created_at DESC, IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
			) orig
		LEFT JOIN (SELECT id FROM vivazul_lynkos.cadastros 
			WHERE STATUS = 10 AND dominio = 'casaoficio' AND cadas_nome IS NOT NULL AND LENGTH(TRIM(cadas_nome)) > 0
			-- GROUP BY IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
			ORDER BY created_at DESC, IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
			) vvz ON orig.id = vvz.id
		WHERE vvz.id IS NULL)
);

/*Importar com_prop_itens*/
INSERT INTO vivazul_bceaa5.com_prop_itens (
  id,evento,created_at,updated_at,STATUS,
  id_com_propostas,id_com_prop_compos,id_com_produtos,
  ordem,item,item_ativo,compoe_valor,descricao,quantidade,valor_unitario,desconto_ativo,desconto_total,old_id
)(
	SELECT 0,1,NOW(),NULL,10,
	cp.id id_com_propostas,comps.id id_com_prop_compos,prods.id id_com_produtos,
	it.ordem,it.item_nr,it.compoe_valor,it.compoe_valor,it.descricao,it.quantidade,it.valor_unitario,it.desconto_ativo,it.desconto_total,it.id
	FROM vivazul_lynkos.com_proposta_item it
	JOIN vivazul_bceaa5.com_propostas cp ON cp.old_id = it.id_com_proposta
	LEFT JOIN vivazul_bceaa5.com_prop_compos comps ON comps.old_id = it.id_compos
	JOIN vivazul_bceaa5.com_produtos prods ON prods.old_id = it.id_com_produtos
	JOIN vivazul_bceaa5.pipeline p ON p.id = cp.id_pipeline
	JOIN vivazul_bceaa5.cadastros c ON c.id = p.id_cadastros
	WHERE it.dominio = 'casaoficio' AND it.status = 10 AND c.old_id IN (SELECT orig.id FROM 
			(SELECT id FROM vivazul_lynkos_or.cadastros 
			WHERE STATUS = 10 AND dominio = 'casaoficio' AND cadas_nome IS NOT NULL AND LENGTH(TRIM(cadas_nome)) > 0
			-- GROUP BY IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
			ORDER BY created_at DESC, IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
			) orig
		LEFT JOIN (SELECT id FROM vivazul_lynkos.cadastros 
			WHERE STATUS = 10 AND dominio = 'casaoficio' AND cadas_nome IS NOT NULL AND LENGTH(TRIM(cadas_nome)) > 0
			-- GROUP BY IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
			ORDER BY created_at DESC, IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
			) vvz ON orig.id = vvz.id
		WHERE vvz.id IS NULL)
);

SET FOREIGN_KEY_CHECKS=1; 