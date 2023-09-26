/* Database properties */
CREATE DATABASE `vivazul_cso_root`CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
GRANT ALTER, ALTER ROUTINE, CREATE, CREATE ROUTINE, CREATE TEMPORARY TABLES, CREATE VIEW, DELETE, DROP, EVENT, EXECUTE, INDEX, INSERT, LOCK TABLES, REFERENCES, SELECT, SHOW VIEW, TRIGGER, UPDATE ON `vivazul_cso_root`.* TO 'vivazul_api'@'%' WITH GRANT OPTION;

/*!40101 SET NAMES utf8 */;

/*!40101 SET SQL_MODE=''*/;

/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
CREATE DATABASE /*!32312 IF NOT EXISTS*/`vivazul_cso_root` /*!40100 DEFAULT CHARACTER SET utf8mb4 */;

USE `vivazul_cso_root`;

/*Table structure for table `cad_contatos` */

DROP TABLE IF EXISTS `cad_contatos`;

CREATE TABLE `cad_contatos` (
  `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `evento` INT(11) NOT NULL,
  `created_at` VARCHAR(255) NOT NULL,
  `updated_at` VARCHAR(255) DEFAULT NULL,
  `status` VARCHAR(255) NOT NULL DEFAULT '0' COMMENT 'Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)',
  `id_cadastros` INT(10) UNSIGNED NOT NULL,
  `id_tipo` INT(10) UNSIGNED NOT NULL,
  `pessoa` VARCHAR(255) NOT NULL COMMENT 'Pessoa de contato',
  `departamento` VARCHAR(255) DEFAULT NULL COMMENT 'Departamento',
  `meio` VARCHAR(255) NOT NULL COMMENT 'Meio de contato (P.Ex.: nr do telefone ou email)',
  `obs` VARCHAR(255) DEFAULT NULL COMMENT 'Observações do endereço',
  PRIMARY KEY (`id`),
  KEY `vivazul_cso_root_cad_contatos_id_cadastros_foreign` (`id_cadastros`),
  KEY `vivazul_cso_root_cad_contatos_id_tipo_foreign` (`id_tipo`),
  CONSTRAINT `vivazul_cso_root_cad_contatos_id_cadastros_foreign` FOREIGN KEY (`id_cadastros`) REFERENCES `cadastros` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT `vivazul_cso_root_cad_contatos_id_tipo_foreign` FOREIGN KEY (`id_tipo`) REFERENCES `local_params` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=INNODB DEFAULT CHARSET=utf8mb4;

/*Table structure for table `cad_documentos` */

DROP TABLE IF EXISTS `cad_documentos`;

CREATE TABLE `cad_documentos` (
  `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `evento` INT(11) NOT NULL,
  `created_at` VARCHAR(255) NOT NULL,
  `updated_at` VARCHAR(255) DEFAULT NULL,
  `status` VARCHAR(255) NOT NULL DEFAULT '0' COMMENT 'Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)',
  `id_cadastros` INT(10) UNSIGNED NOT NULL,
  `id_tipo` INT(10) UNSIGNED NOT NULL,
  `documento` VARCHAR(255) NOT NULL COMMENT 'Número do documento',
  `emissao` VARCHAR(255) DEFAULT NULL COMMENT 'Data de emissão',
  `validade` VARCHAR(255) DEFAULT NULL COMMENT 'Data de validade',
  `obs` VARCHAR(255) DEFAULT NULL COMMENT 'Observações do documento',
  PRIMARY KEY (`id`),
  KEY `vivazul_cso_root_cad_documentos_id_cadastros_foreign` (`id_cadastros`),
  KEY `vivazul_cso_root_cad_documentos_id_tipo_foreign` (`id_tipo`),
  CONSTRAINT `vivazul_cso_root_cad_documentos_id_cadastros_foreign` FOREIGN KEY (`id_cadastros`) REFERENCES `cadastros` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT `vivazul_cso_root_cad_documentos_id_tipo_foreign` FOREIGN KEY (`id_tipo`) REFERENCES `local_params` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=INNODB DEFAULT CHARSET=utf8mb4;

/*Table structure for table `cad_enderecos` */

DROP TABLE IF EXISTS `cad_enderecos`;

CREATE TABLE `cad_enderecos` (
  `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `evento` INT(11) NOT NULL,
  `created_at` VARCHAR(255) NOT NULL,
  `updated_at` VARCHAR(255) DEFAULT NULL,
  `status` VARCHAR(255) NOT NULL DEFAULT '0' COMMENT 'Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)',
  `id_cadastros` INT(10) UNSIGNED NOT NULL,
  `id_tipo` INT(10) UNSIGNED NOT NULL,
  `cep` VARCHAR(8) NOT NULL COMMENT 'Cep',
  `logradouro` VARCHAR(255) NOT NULL COMMENT 'Logradouro',
  `nr` VARCHAR(255) NOT NULL COMMENT 'Número',
  `complnr` VARCHAR(255) DEFAULT NULL COMMENT 'Complemento',
  `bairro` VARCHAR(255) DEFAULT NULL COMMENT 'Bairro',
  `cidade` VARCHAR(255) NOT NULL COMMENT 'Cidade',
  `uf` VARCHAR(2) NOT NULL COMMENT 'Estado',
  `ibge` VARCHAR(8) DEFAULT NULL COMMENT 'IBGE',
  `geo_ltd` VARCHAR(255) DEFAULT NULL COMMENT 'Geo. latd',
  `geo_lng` VARCHAR(255) DEFAULT NULL COMMENT 'Geo. lng',
  `obs` VARCHAR(255) DEFAULT NULL COMMENT 'Observações do endereço',
  PRIMARY KEY (`id`),
  KEY `vivazul_cso_root_cad_enderecos_id_cadastros_foreign` (`id_cadastros`),
  KEY `vivazul_cso_root_cad_enderecos_id_tipo_foreign` (`id_tipo`),
  CONSTRAINT `vivazul_cso_root_cad_enderecos_id_cadastros_foreign` FOREIGN KEY (`id_cadastros`) REFERENCES `cadastros` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT `vivazul_cso_root_cad_enderecos_id_tipo_foreign` FOREIGN KEY (`id_tipo`) REFERENCES `local_params` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=INNODB DEFAULT CHARSET=utf8mb4;

/*Table structure for table `cadastros` */

DROP TABLE IF EXISTS `cadastros`;

CREATE TABLE `cadastros` (
  `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `evento` INT(11) NOT NULL,
  `created_at` VARCHAR(255) NOT NULL,
  `updated_at` VARCHAR(255) DEFAULT NULL,
  `status` VARCHAR(255) NOT NULL DEFAULT '0' COMMENT 'Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)',
  `prospect` INT(1) NOT NULL DEFAULT 1 COMMENT 'Prospecto (Não: 0; Sim: 1)',
  `id_params_tipo` INT(10) UNSIGNED NOT NULL COMMENT 'Tipo de cliente (Arquiteto, Cliente, Fornecedor)',
  `id_params_atuacao` INT(10) UNSIGNED NOT NULL COMMENT 'Área de atuação (Chave estrangeira com a tabela CLI_DOM.local_params)',
  `cpf_cnpj` VARCHAR(255) NOT NULL COMMENT 'CPF ou CNPJ',
  `rg_ie` VARCHAR(255) DEFAULT NULL COMMENT 'RG(PF) ou Inscrição Estadual(PJ)',
  `nome` VARCHAR(255) NOT NULL COMMENT 'Nome ou razão social',
  `id_params_sexo` INT(10) UNSIGNED NOT NULL COMMENT 'Sexo(apenas PF) (Masc: 0; Fem: 1; Outro: 2)',
  `aniversario` VARCHAR(255) DEFAULT NULL COMMENT 'Nascimento(PF) | Fundação(PJ)',
  `id_params_p_nascto` INT(10) UNSIGNED DEFAULT NULL COMMENT 'Nacionalidade',
  `observacao` VARCHAR(2500) DEFAULT NULL COMMENT 'Observações do cliente',
  `telefone` VARCHAR(11) DEFAULT NULL COMMENT 'Primeiro telefone',
  `email` VARCHAR(250) DEFAULT NULL COMMENT 'Primeiro email',
  PRIMARY KEY (`id`),
  UNIQUE KEY `vivazul_cso_root_cadastros_cpf_cnpj_unique` (`cpf_cnpj`),
  KEY `vivazul_cso_root_cadastros_id_atuacao_foreign` (`id_params_atuacao`),
  KEY `vivazul_cso_root_cadastros_tipo_foreign` (`id_params_tipo`),
  KEY `vivazul_cso_root_cadastros_sexo_foreign` (`id_params_sexo`),
  KEY `vivazul_cso_root_cadastros_nacionalidade_foreign` (`id_params_p_nascto`),
  CONSTRAINT `vivazul_cso_root_cadastros_id_atuacao_foreign` FOREIGN KEY (`id_params_atuacao`) REFERENCES `local_params` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT `vivazul_cso_root_cadastros_nacionalidade_foreign` FOREIGN KEY (`id_params_p_nascto`) REFERENCES `vivazul_api`.`params` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT `vivazul_cso_root_cadastros_sexo_foreign` FOREIGN KEY (`id_params_sexo`) REFERENCES `vivazul_api`.`params` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT `vivazul_cso_root_cadastros_tipo_foreign` FOREIGN KEY (`id_params_tipo`) REFERENCES `local_params` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=INNODB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4;

/*Table structure for table `com_agentes` */

DROP TABLE IF EXISTS `com_agentes`;

CREATE TABLE `com_agentes` (
  `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `evento` INT(11) NOT NULL,
  `created_at` VARCHAR(255) NOT NULL,
  `updated_at` VARCHAR(255) DEFAULT NULL,
  `status` VARCHAR(255) NOT NULL DEFAULT '0' COMMENT 'Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)',
  `ordem` VARCHAR(3) DEFAULT NULL COMMENT 'Número identificador próprio',
  `id_cadastros` INT(10) UNSIGNED NOT NULL COMMENT 'Registro no cadastro',
  `dsr` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Recebe DSR',
  `observacao` DECIMAL(10,2) DEFAULT NULL COMMENT 'Observação do registro',
  PRIMARY KEY (`id`),
  KEY `vivazul_cso_root_com_agentes_id_cadastros_foreign` (`id_cadastros`),
  CONSTRAINT `vivazul_cso_root_com_agentes_id_cadastros_foreign` FOREIGN KEY (`id_cadastros`) REFERENCES `cadastros` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=INNODB DEFAULT CHARSET=utf8mb4;

/*Table structure for table `com_terceiros` */

DROP TABLE IF EXISTS `com_terceiros`;

CREATE TABLE `com_terceiros` (
  `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `evento` INT(11) NOT NULL,
  `created_at` VARCHAR(255) NOT NULL,
  `updated_at` VARCHAR(255) DEFAULT NULL,
  `status` VARCHAR(255) NOT NULL DEFAULT '0' COMMENT 'Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)',
  `id_pipeline` INT(11) UNSIGNED NOT NULL COMMENT 'Documento relacionado ',
  `id_com_agentes` INT(11) UNSIGNED NOT NULL COMMENT 'Agente',
  `terceiro` TINYINT(1) DEFAULT NULL COMMENT 'Se um terceiro',
  `valor_base` DECIMAL(10,2) DEFAULT NULL COMMENT 'Valor base de cálculo da comissão',
  `participacao` DECIMAL(10,2) DEFAULT NULL COMMENT 'Percentual de comissão',
  `liquidacao` VARCHAR(255) DEFAULT NULL COMMENT 'Data da liquidação',
  PRIMARY KEY (`id`),
  KEY `vivazul_cso_root_com_terceiros_id_pipeline_foreign` (`id_pipeline`),
  KEY `vivazul_cso_root_com_terceiros_id_com_agentes_foreign` (`id_com_agentes`),
  CONSTRAINT `vivazul_cso_root_com_terceiros_id_com_agentes_foreign` FOREIGN KEY (`id_com_agentes`) REFERENCES `com_agentes` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT `vivazul_cso_root_com_terceiros_id_pipeline_foreign` FOREIGN KEY (`id_pipeline`) REFERENCES `pipeline` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=INNODB DEFAULT CHARSET=utf8mb4;

/*Table structure for table `empresa` */

DROP TABLE IF EXISTS `empresa`;

CREATE TABLE `empresa` (
  `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `evento` INT(11) NOT NULL,
  `created_at` VARCHAR(255) NOT NULL,
  `updated_at` VARCHAR(255) DEFAULT NULL,
  `status` VARCHAR(255) NOT NULL DEFAULT '0' COMMENT 'Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)',
  `dominio` VARCHAR(255) NOT NULL COMMENT 'Domínio do cliente',
  `razaosocial` VARCHAR(255) DEFAULT NULL COMMENT 'Razão social do cadastro',
  `fantasia` VARCHAR(255) DEFAULT NULL COMMENT 'Nome fantasia da empresa',
  `cpf_cnpj_empresa` VARCHAR(255) DEFAULT NULL COMMENT 'CNPJ do cadastro',
  `ie` VARCHAR(255) DEFAULT NULL COMMENT 'Inscrição estadual',
  `ie_st` VARCHAR(255) DEFAULT NULL COMMENT 'Inscrição estadual do substituto tributário',
  `im` VARCHAR(255) DEFAULT NULL COMMENT 'nscrição municipal',
  `cnae` VARCHAR(255) DEFAULT NULL COMMENT 'CNAE',
  `cep` VARCHAR(8) NOT NULL COMMENT 'Cep',
  `logradouro` VARCHAR(255) NOT NULL COMMENT 'Logradouro',
  `nr` VARCHAR(255) NOT NULL COMMENT 'Número',
  `complnr` VARCHAR(255) DEFAULT NULL COMMENT 'Complemento',
  `bairro` VARCHAR(255) DEFAULT NULL COMMENT 'Bairro',
  `cidade` VARCHAR(255) NOT NULL COMMENT 'Cidade',
  `uf` VARCHAR(2) NOT NULL COMMENT 'Estado',
  `ibge` VARCHAR(8) DEFAULT NULL COMMENT 'IBGE',
  `geo_ltd` VARCHAR(255) DEFAULT NULL COMMENT 'Geo. latd',
  `geo_lng` VARCHAR(255) DEFAULT NULL COMMENT 'Geo. lng',
  `contato` TEXT DEFAULT NULL COMMENT 'Contato da empresa',
  `tel1` TEXT DEFAULT NULL COMMENT 'Telefone 1',
  `tel2` VARCHAR(255) DEFAULT NULL COMMENT 'Telefone 2',
  `email` VARCHAR(255) DEFAULT NULL COMMENT 'Email geral',
  `emailAt` VARCHAR(255) DEFAULT NULL COMMENT 'Email da At',
  `emailComercial` VARCHAR(255) DEFAULT NULL COMMENT 'Email comercial',
  `emailFinanceiro` VARCHAR(255) DEFAULT NULL COMMENT 'Email do financeiro',
  `emailRH` VARCHAR(255) DEFAULT NULL COMMENT 'Email do RH',
  `id_cadas_resplegal` INT(10) UNSIGNED DEFAULT NULL COMMENT 'Responsável legal perante a Receita Federal',
  `url_logo` TEXT DEFAULT NULL COMMENT 'Logomarca da empresa',
  PRIMARY KEY (`id`),
  UNIQUE KEY `vivazul_cso_root_empresa_dominio_unique` (`dominio`),
  KEY `vivazul_cso_root_empresa_id_cadas_resplegal_foreign` (`id_cadas_resplegal`),
  CONSTRAINT `vivazul_cso_root_empresa_id_cadas_resplegal_foreign` FOREIGN KEY (`id_cadas_resplegal`) REFERENCES `cadastros` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=INNODB DEFAULT CHARSET=utf8mb4;

/*Table structure for table `fin_cc` */

DROP TABLE IF EXISTS `fin_cc`;

CREATE TABLE `fin_cc` (
  `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `evento` INT(11) NOT NULL,
  `created_at` VARCHAR(255) NOT NULL,
  `updated_at` VARCHAR(255) DEFAULT NULL,
  `status` VARCHAR(255) NOT NULL DEFAULT '0' COMMENT 'Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)',
  `codigo` VARCHAR(255) NOT NULL COMMENT 'Código da despesa ou receita',
  `tipo` CHAR(1) NOT NULL COMMENT 'Despesa ou receita',
  `descricao` VARCHAR(50) NOT NULL COMMENT 'Descrição do centro de custo',
  PRIMARY KEY (`id`)
) ENGINE=INNODB DEFAULT CHARSET=utf8mb4;

/*Table structure for table `fin_lancamentos` */

DROP TABLE IF EXISTS `fin_lancamentos`;

CREATE TABLE `fin_lancamentos` (
  `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `evento` INT(11) NOT NULL,
  `created_at` VARCHAR(255) NOT NULL,
  `updated_at` VARCHAR(255) DEFAULT NULL,
  `status` VARCHAR(255) NOT NULL DEFAULT '0' COMMENT 'Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)',
  `tp_cta` CHAR(1) DEFAULT NULL COMMENT '+=Receber;-=Pagar',
  `id_empresa` INT(10) UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Codigo relacional com a tabela sis_demp',
  `id_cadastros` INT(10) UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Codigo relacional com a tabela de cadastros',
  `id_centro_custo` INT(10) UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Codigo relacional com a tabela fin_centro_custo',
  `tipoDocumento` VARCHAR(255) DEFAULT NULL COMMENT 'Documento gerado: CF, NF-e, NFS-e',
  `doc_fiscal` VARCHAR(255) DEFAULT '0' COMMENT 'Nota fiscal do lancamento',
  `data_lanc` CHAR(10) DEFAULT NULL COMMENT 'Data do lancamento da conta no sistema',
  `data_vencimento` CHAR(10) DEFAULT NULL COMMENT 'Data de vencimento programado para a conta',
  `data_pagto` CHAR(10) DEFAULT NULL COMMENT 'Data real que aconteceu o pagamento',
  `valor_bruto` DOUBLE(11,2) DEFAULT 0.00 COMMENT 'Valor bruto da conta',
  `valor_bruto_nf` DOUBLE(11,2) DEFAULT 0.00 COMMENT 'Valor bruto da nota fiscal',
  `valor_retencao` DOUBLE(11,2) DEFAULT 0.00 COMMENT 'Valor da retenção. Este campo será impresso na duplicata.',
  `valor_liquido` DOUBLE(11,2) DEFAULT 0.00 COMMENT 'Valor liquido da conta',
  `descricao_retencao` VARCHAR(250) DEFAULT NULL COMMENT 'Descrição abreviada do motivo da retencao. Este campo será impresso na duplicata.',
  `valor_vencimentos` DOUBLE(11,2) DEFAULT 0.00 COMMENT 'Valor bruto da conta',
  `valor_nota_fiscal` DOUBLE(11,2) DEFAULT 0.00 COMMENT 'Valor total da nota fiscal para impressão na duplicata',
  `duplicata` VARCHAR(255) DEFAULT NULL COMMENT 'Duplicata da conta gerada no faturamento',
  `duplicata_impr` INT(1) DEFAULT 0 COMMENT 'Quantidade de vezes que a duplicata foi impresso',
  `descricao_conta` VARCHAR(100) DEFAULT NULL COMMENT 'Descrição da conta',
  `obs_da_conta` VARCHAR(2500) DEFAULT NULL COMMENT 'Observacao da conta',
  `vencimento` VARCHAR(3) DEFAULT NULL COMMENT 'Parcela da conta. Ex.',
  `forma_pagto` VARCHAR(255) DEFAULT NULL COMMENT 'Forma de pagamento utilizada',
  `doc_pagto` VARCHAR(255) DEFAULT NULL COMMENT 'Documento que quitou o pagamento',
  `situacao` CHAR(1) DEFAULT '0' COMMENT 'Situacao:-1-Ainda não é considerado duplicata pois não foi impresso;0-Todos;1-Pendente;2-Cancelado;3-Quitado;4-Conciliado',
  `motiv_cancel` VARCHAR(255) DEFAULT NULL COMMENT 'Caso situacao=2 descrever o motivo do cancelamento',
  PRIMARY KEY (`id`),
  KEY `vivazul_cso_root_fin_lancamentos_id_cadastros_foreign` (`id_cadastros`),
  KEY `vivazul_cso_root_fin_lancamentos_id_empresa_foreign` (`id_empresa`),
  KEY `vivazul_cso_root_fin_lancamentos_id_centro_custo_foreign` (`id_centro_custo`),
  CONSTRAINT `vivazul_cso_root_fin_lancamentos_id_cadastros_foreign` FOREIGN KEY (`id_cadastros`) REFERENCES `cadastros` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT `vivazul_cso_root_fin_lancamentos_id_centro_custo_foreign` FOREIGN KEY (`id_centro_custo`) REFERENCES `fin_cc` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT `vivazul_cso_root_fin_lancamentos_id_empresa_foreign` FOREIGN KEY (`id_empresa`) REFERENCES `empresa` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=INNODB DEFAULT CHARSET=utf8mb4;

/*Table structure for table `fin_retencoes` */

DROP TABLE IF EXISTS `fin_retencoes`;

CREATE TABLE `fin_retencoes` (
  `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `evento` INT(11) NOT NULL,
  `created_at` VARCHAR(255) NOT NULL,
  `updated_at` VARCHAR(255) DEFAULT NULL,
  `status` VARCHAR(255) NOT NULL DEFAULT '0' COMMENT 'Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)',
  `id_fin_lanc` INT(10) UNSIGNED NOT NULL COMMENT 'Chave estrangeira com a tabela fin_lancamentos',
  `valor` DOUBLE(11,2) DEFAULT 0.00 COMMENT 'Valor da retenção',
  `Valor da retenção` VARCHAR(250) DEFAULT '0' COMMENT 'Descrição da retenção',
  PRIMARY KEY (`id`),
  KEY `vivazul_cso_root_fin_retencoes_id_fin_lanc_foreign` (`id_fin_lanc`),
  CONSTRAINT `vivazul_cso_root_fin_retencoes_id_fin_lanc_foreign` FOREIGN KEY (`id_fin_lanc`) REFERENCES `fin_lancamentos` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=INNODB DEFAULT CHARSET=utf8mb4;

/*Table structure for table `pipeline` */

DROP TABLE IF EXISTS `pipeline`;

CREATE TABLE `pipeline` (
  `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `evento` INT(11) NOT NULL,
  `created_at` VARCHAR(255) NOT NULL,
  `updated_at` VARCHAR(255) DEFAULT NULL,
  `status` VARCHAR(255) NOT NULL DEFAULT '0' COMMENT 'Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)',
  `id_pipeline_params` INT(10) UNSIGNED NOT NULL COMMENT 'Parâmetro',
  `id_pai` INT(10) UNSIGNED DEFAULT NULL COMMENT 'Documento pai',
  `id_filho` INT(10) UNSIGNED DEFAULT NULL COMMENT 'Documento filho',
  `id_cadastros` INT(10) UNSIGNED NOT NULL COMMENT 'Cliente ',
  `id_com_agentes` INT(10) UNSIGNED DEFAULT NULL COMMENT 'Agente de vendas do atendimento',
  `status_comissao` VARCHAR(255) DEFAULT NULL COMMENT 'Status da comissão',
  `documento` VARCHAR(255) DEFAULT '0' COMMENT 'Data da liquidação',
  `versao` INT(2) DEFAULT 0 COMMENT 'Versão',
  `descricao` VARCHAR(2500) DEFAULT NULL COMMENT 'Descrição abreviada do documento',
  `valor_bruto` DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Valor do documento',
  `valor_liq` DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Valor liquido do documento',
  `valor_representacao` DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Valor base de comissionamento da representação ',
  `perc_represent` DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Percentual de comissão da representação',
  `valor_agente` DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Valor base de comissionamento dos agentes',
  PRIMARY KEY (`id`),
  KEY `vivazul_cso_root_pipeline_id_pipeline_params_foreign` (`id_pipeline_params`),
  KEY `vivazul_cso_root_pipeline_id_cadastros_foreign` (`id_cadastros`),
  CONSTRAINT `vivazul_cso_root_pipeline_id_cadastros_foreign` FOREIGN KEY (`id_cadastros`) REFERENCES `cadastros` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT `vivazul_cso_root_pipeline_id_pipeline_params_foreign` FOREIGN KEY (`id_pipeline_params`) REFERENCES `pipeline_params` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=INNODB DEFAULT CHARSET=utf8mb4;

/*Table structure for table `pipeline_params` */

DROP TABLE IF EXISTS `pipeline_params`;

CREATE TABLE `pipeline_params` (
  `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `evento` INT(11) NOT NULL,
  `created_at` VARCHAR(255) NOT NULL,
  `updated_at` VARCHAR(255) DEFAULT NULL,
  `status` VARCHAR(255) NOT NULL DEFAULT '0' COMMENT 'Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)',
  `descricao` VARCHAR(50) DEFAULT NULL COMMENT 'select,insert,update,references  Descrição abreviada do parâmetro',
  `bi_index` TINYINT(1) DEFAULT 0 COMMENT 'select,insert,update,references  Apresentação em BI',
  `doc_venda` TINYINT(1) DEFAULT 0 COMMENT 'select,insert,update,references  É documento de venda',
  `autom_nr` TINYINT(1) DEFAULT 0 COMMENT 'select,insert,update,references  Numeracao automatica',
  `gera_baixa` TINYINT(1) DEFAULT 0 COMMENT 'select,insert,update,references  Pode ser convertido em pedido',
  `tipo_secundario` TINYINT(1) DEFAULT 0 COMMENT 'select,insert,update,references  Tipo secundário',
  `obrig_valor` TINYINT(1) DEFAULT 0 COMMENT 'select,insert,update,references  Obrigatorio declarar valor',
  `reg_agente` TINYINT(1) DEFAULT 0 COMMENT 'select,insert,update,references  Obrigatório agente ',
  `id_logo` VARCHAR(255) DEFAULT '0' COMMENT 'select,insert,update,references  URL logomarca representada',
  `gera_pasta` TINYINT(1) DEFAULT 0 COMMENT 'select,insert,update,references  Gera pasta(0=Não, 1=Documento, 2=documento_baixa)',
  `proposta_interna` TINYINT(1) DEFAULT 0 COMMENT 'select,insert,update,references  Utiliza o sistema de proposta interna',
  PRIMARY KEY (`id`)
) ENGINE=INNODB DEFAULT CHARSET=utf8mb4;

/*Table structure for table `protocolo` */

DROP TABLE IF EXISTS `protocolo`;

CREATE TABLE `protocolo` (
  `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `evento` INT(11) NOT NULL,
  `created_at` VARCHAR(255) NOT NULL,
  `updated_at` VARCHAR(255) DEFAULT NULL,
  `status` VARCHAR(255) NOT NULL DEFAULT '0' COMMENT 'Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)',
  `id_cadastros` INT(10) UNSIGNED NOT NULL COMMENT 'Registro do Destinatário no cadastro',
  `email_destinatario` VARCHAR(255) DEFAULT NULL COMMENT 'Destinatário(email)',
  `registro` VARCHAR(255) DEFAULT NULL COMMENT 'Número do protocolo',
  `titulo` VARCHAR(255) DEFAULT NULL COMMENT 'Port',
  `e_s` VARCHAR(255) DEFAULT NULL COMMENT 'Movimento',
  `descricao` VARCHAR(255) DEFAULT NULL COMMENT 'Descrição do documento',
  PRIMARY KEY (`id`),
  KEY `vivazul_cso_root_protocolo_id_cadastros_foreign` (`id_cadastros`),
  CONSTRAINT `vivazul_cso_root_protocolo_id_cadastros_foreign` FOREIGN KEY (`id_cadastros`) REFERENCES `cadastros` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=INNODB DEFAULT CHARSET=utf8mb4;

/*Table structure for table `pipeline_status` */

DROP TABLE IF EXISTS `pipeline_status`;

CREATE TABLE `pipeline_status` (
  `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `evento` INT(11) NOT NULL,
  `created_at` VARCHAR(255) NOT NULL,
  `updated_at` VARCHAR(255) DEFAULT NULL,
  `status` VARCHAR(255) NOT NULL DEFAULT '0' COMMENT 'Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)',
  `id_pipeline` INT(10) UNSIGNED DEFAULT NULL COMMENT 'Documento pai',
  `status_params` INT(10) UNSIGNED NOT NULL COMMENT 'Status do documento-+',
  PRIMARY KEY (`id`),
  KEY `vivazul_cso_root_pipeline_status_id_pipeline_foreign` (`id_pipeline`),
  CONSTRAINT `vivazul_cso_root_pipeline_status_id_pipeline_foreign` FOREIGN KEY (`id_pipeline`) REFERENCES `pipeline` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=INNODB DEFAULT CHARSET=utf8mb4;

/*Table structure for table `local_params` */

DROP TABLE IF EXISTS `local_params`;

CREATE TABLE `local_params` (
  `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `evento` INT(11) NOT NULL,
  `created_at` VARCHAR(255) NOT NULL,
  `updated_at` VARCHAR(255) DEFAULT NULL,
  `status` VARCHAR(255) NOT NULL DEFAULT '0',
  `grupo` VARCHAR(255) DEFAULT NULL COMMENT 'Grupo do parâmetro',
  `parametro` VARCHAR(1000) DEFAULT NULL COMMENT 'Parâmetro',
  `label` VARCHAR(1000) DEFAULT NULL COMMENT 'Label',
  PRIMARY KEY (`id`)
) ENGINE=INNODB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4;

/*Table structure for table `pv` */

DROP TABLE IF EXISTS `pv`;

CREATE TABLE `pv` (
  `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `evento` INT(11) NOT NULL,
  `created_at` VARCHAR(255) NOT NULL,
  `updated_at` VARCHAR(255) DEFAULT NULL,
  `status` VARCHAR(255) NOT NULL DEFAULT '0' COMMENT 'Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)',
  `id_cadastros` INT(10) UNSIGNED NOT NULL COMMENT 'Cliente',
  `id_pipeline` INT(10) UNSIGNED DEFAULT NULL COMMENT 'pipeline',
  `tipo` INT(1) NOT NULL DEFAULT 0 COMMENT 'Tipo de pv (SUPORTE:0; MONTAGEM:1)',
  `pv_nr` VARCHAR(255) DEFAULT NULL COMMENT 'Número do PV',
  `obs` TEXT DEFAULT NULL COMMENT 'Observação',
  `situacao` CHAR(2) NOT NULL COMMENT 'Situação do pós atendimento',
  PRIMARY KEY (`id`),
  KEY `vivazul_cso_root_pv_id_cadastros_foreign` (`id_cadastros`),
  KEY `vivazul_cso_root_pv_id_pipeline_foreign` (`id_pipeline`),
  CONSTRAINT `vivazul_cso_root_pv_id_cadastros_foreign` FOREIGN KEY (`id_cadastros`) REFERENCES `cadastros` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT `vivazul_cso_root_pv_id_pipeline_foreign` FOREIGN KEY (`id_pipeline`) REFERENCES `pipeline` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=INNODB DEFAULT CHARSET=utf8mb4;

/*Table structure for table `pv_oat` */

DROP TABLE IF EXISTS `pv_oat`;

CREATE TABLE `pv_oat` (
  `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `evento` INT(11) NOT NULL,
  `created_at` VARCHAR(255) NOT NULL,
  `updated_at` VARCHAR(255) DEFAULT NULL,
  `status` VARCHAR(255) NOT NULL DEFAULT '0' COMMENT 'Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)',
  `id_pv` INT(10) UNSIGNED NOT NULL COMMENT 'ID do pv',
  `id_cadastro_endereco` INT(10) UNSIGNED NOT NULL COMMENT 'Endereço do atendimento',
  `id_tecnico` INT(10) UNSIGNED DEFAULT NULL COMMENT 'Técnico responsável',
  `nr_oat` INT(3) NOT NULL COMMENT 'OAT',
  `int_ext` INT(10) NOT NULL COMMENT 'Interno/Externo',
  `garantia` INT(1) NOT NULL COMMENT 'Garantia',
  `nf_garantia` VARCHAR(255) DEFAULT NULL COMMENT 'Nota fiscal do produto',
  `pessoa_contato` VARCHAR(255) NOT NULL COMMENT 'Contato no cliente',
  `telefone_contato` VARCHAR(255) NOT NULL COMMENT 'Telefone do contato',
  `email_contato` VARCHAR(255) DEFAULT NULL COMMENT 'Email do contato',
  `descricao` TEXT DEFAULT NULL COMMENT 'Descrição dos serviços',
  `valor_total` DECIMAL(10,2) DEFAULT NULL COMMENT 'Valor dos serviços',
  `aceite_do_cliente` VARCHAR(255) DEFAULT NULL COMMENT 'Data do aceite',
  PRIMARY KEY (`id`),
  KEY `vivazul_cso_root_pv_oat_id_pv_foreign` (`id_pv`),
  KEY `vivazul_cso_root_pv_oat_id_cadastro_endereco_foreign` (`id_cadastro_endereco`),
  KEY `vivazul_cso_root_pv_oat_id_tecnico_foreign` (`id_tecnico`),
  CONSTRAINT `vivazul_cso_root_pv_oat_id_cadastro_endereco_foreign` FOREIGN KEY (`id_cadastro_endereco`) REFERENCES `pipeline_params` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT `vivazul_cso_root_pv_oat_id_pv_foreign` FOREIGN KEY (`id_pv`) REFERENCES `pv` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT `vivazul_cso_root_pv_oat_id_tecnico_foreign` FOREIGN KEY (`id_tecnico`) REFERENCES `pv_tecnicos` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=INNODB DEFAULT CHARSET=utf8mb4;

/*Table structure for table `pv_tecnicos` */

DROP TABLE IF EXISTS `pv_tecnicos`;

CREATE TABLE `pv_tecnicos` (
  `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `evento` INT(11) NOT NULL,
  `created_at` VARCHAR(255) NOT NULL,
  `updated_at` VARCHAR(255) DEFAULT NULL,
  `status` VARCHAR(255) NOT NULL DEFAULT '0' COMMENT 'Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)',
  `tecnico` VARCHAR(255) DEFAULT NULL COMMENT 'Técnico responsável',
  `telefone_contato` VARCHAR(255) NOT NULL COMMENT 'Telefone do contato',
  `email_contato` VARCHAR(255) DEFAULT NULL COMMENT 'Email do contato',
  `observacao` TEXT DEFAULT NULL COMMENT 'Descrição dos serviços',
  PRIMARY KEY (`id`)
) ENGINE=INNODB DEFAULT CHARSET=utf8mb4;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
