SET FOREIGN_KEY_CHECKS = 0;

INSERT INTO vivazul_bceaa5.cad_contatos_itens (id,evento,created_at,updated_at,STATUS,id_cad_contatos,id_params_tipo,meio)
(SELECT 0,evento,created_at,updated_at,STATUS,id,id_params_tipo,meio FROM cad_contatos);

ALTER TABLE `vivazul_bceaa5`.`cad_contatos` 
CHANGE `meio` `meio` VARCHAR(255) CHARSET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT 'Meio de contato (P.Ex.: nr do telefone ou email)',
CHANGE `id_params_tipo` `id_params_tipo` INT(10) UNSIGNED NULL; 

SET FOREIGN_KEY_CHECKS = 1;