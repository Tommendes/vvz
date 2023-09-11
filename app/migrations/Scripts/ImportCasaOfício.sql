/*Criação dos parâmetros (local_params) do cliente*/
/*Remove o tipo TESTE dentre as opções antes de inserir na tabela local_params*/
UPDATE vivazul_lynkos.cadastros SET tipo = NULL WHERE LOWER(tipo) IN ('teste');
/*Limpar a tabela local_params*/
DELETE FROM vivazul_cso_root.local_params;
ALTER TABLE vivazul_cso_root.local_params AUTO_INCREMENT=0;
/*tipo_cadastro*/
INSERT INTO vivazul_cso_root.local_params (
  id,evento,created_at,updated_at,STATUS,grupo,parametro,label
) (SELECT 0,1,NOW(),NULL,10,'tipo_cadastro',tipo,tipo FROM vivazul_lynkos.cadastros 
	WHERE LENGTH(TRIM(tipo)) > 0 AND tipo IS NOT NULL GROUP BY tipo ORDER BY tipo);
/*id_atuacao*/
INSERT INTO vivazul_cso_root.local_params (
  id,evento,created_at,updated_at,STATUS,grupo,parametro,label
) (SELECT 0,1,NOW(),NULL,10,'id_atuacao',id,label FROM vivazul_lynkos.params 
	WHERE grupo = 'catu' AND LENGTH(TRIM(parametro)) > 0 AND parametro IS NOT NULL GROUP BY parametro ORDER BY parametro);
/*Adiciona coluna de referência entre BDs*/
ALTER TABLE vivazul_cso_root.cadastros ADD COLUMN old_id INT(10) UNSIGNED NOT NULL;

/*Remover duplicatas em cadastros. Executar até o resultado da execução ser igual a zero*/
UPDATE vivazul_lynkos.cadastros SET dominio = CONCAT(dominio,'_XDEL'), STATUS = 99
WHERE id IN(SELECT id FROM vivazul_lynkos.cadastros 
WHERE STATUS = 10 AND dominio = 'casaoficio' AND LENGTH(cpf_cnpj) IN ('11','14')
GROUP BY cpf_cnpj 
HAVING COUNT(cpf_cnpj) > 1
ORDER BY cadas_nome,created_at);
/*Remove caracteres <>d do field cpf_cnpj*/
UPDATE vivazul_lynkos.cadastros SET cpf_cnpj = NULL WHERE NOT(LENGTH(CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(cpf_cnpj, '[^0-9]+', -1),'[^0-9]+',1) AS UNSIGNED)) IN ('11','14'));
/*Importa os cadastros*/
DELETE FROM `vivazul_cso_root`.`cadastros`;
ALTER TABLE vivazul_cso_root.cadastros AUTO_INCREMENT=0;
INSERT INTO vivazul_cso_root.cadastros (
  id,evento,created_at,updated_at,STATUS,prospect,
  id_params_tipo,
  id_params_atuacao,
  cpf_cnpj,rg_ie,nome,
  id_params_sexo,
  aniversario,id_params_p_nascto,observacao,
  telefone,email,old_id
) ( 
SELECT 
  0,1,FROM_UNIXTIME(created_at)created_at,updated_at,STATUS,
  IF((SELECT COUNT(id) FROM ged WHERE id_cadastro = vivazul_lynkos.cadastros.id) > 0, 0, 1)prospect,
  COALESCE((SELECT id FROM vivazul_cso_root.local_params WHERE parametro = tipo),4)id_params_tipo,
  COALESCE((SELECT id FROM vivazul_cso_root.local_params WHERE parametro = cadas_atuacao_id),1)id_params_atuacao,
  IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)cpf_cnpj,rg_ie,cadas_nome,
  COALESCE((SELECT id FROM vivazul_api.params WHERE LOWER(label) = LOWER(sexo)), 3)id_params_sexo,
  aniversario,4,obs,
  CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(COALESCE(telefone1,telefone2), '[^0-9]+', -1),'[^0-9]+',1) AS UNSIGNED)telefone,email,id 
FROM vivazul_lynkos.cadastros 
WHERE STATUS = 10 AND dominio = 'casaoficio'
GROUP BY IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
ORDER BY created_at DESC, IF((cpf_cnpj = '' OR cpf_cnpj IS NULL), (SELECT LPAD(id,11,'0')), cpf_cnpj)
LIMIT 0, 9999999 
  ) ;

	
DELETE FROM vivazul_cso_root.local_params WHERE id >= 11;
ALTER TABLE vivazul_cso_root.local_params AUTO_INCREMENT=0;
