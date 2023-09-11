/*
SQLyog Professional v12.12 (64 bit)
MySQL - 10.4.24-MariaDB : Database - vivazul_cliente_dominio
*********************************************************************
*/

/*!40101 SET NAMES utf8 */;

/*!40101 SET SQL_MODE=''*/;

/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
CREATE DATABASE /*!32312 IF NOT EXISTS*/`vivazul_cliente_dominio` /*!40100 DEFAULT CHARACTER SET utf8mb4 */;

USE `vivazul_cliente_dominio`;

/*Table structure for table `cad_contatos` */

DROP TABLE IF EXISTS `cad_contatos`;

CREATE TABLE `cad_contatos` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `evento` int(11) NOT NULL,
  `created_at` varchar(255) NOT NULL,
  `updated_at` varchar(255) DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT '0' COMMENT 'Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)',
  `id_cadastros` int(10) unsigned NOT NULL,
  `id_tipo` int(10) unsigned NOT NULL,
  `pessoa` varchar(255) NOT NULL COMMENT 'Pessoa de contato',
  `departamento` varchar(255) DEFAULT NULL COMMENT 'Departamento',
  `meio` varchar(255) NOT NULL COMMENT 'Meio de contato (P.Ex.: nr do telefone ou email)',
  `obs` varchar(255) DEFAULT NULL COMMENT 'Observações do endereço',
  PRIMARY KEY (`id`),
  KEY `vivazul_cliente_dominio_cad_contatos_id_cadastros_foreign` (`id_cadastros`),
  KEY `vivazul_cliente_dominio_cad_contatos_id_tipo_foreign` (`id_tipo`),
  CONSTRAINT `vivazul_cliente_dominio_cad_contatos_id_cadastros_foreign` FOREIGN KEY (`id_cadastros`) REFERENCES `cadastros` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT `vivazul_cliente_dominio_cad_contatos_id_tipo_foreign` FOREIGN KEY (`id_tipo`) REFERENCES `local_params` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/*Table structure for table `cad_documentos` */

DROP TABLE IF EXISTS `cad_documentos`;

CREATE TABLE `cad_documentos` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `evento` int(11) NOT NULL,
  `created_at` varchar(255) NOT NULL,
  `updated_at` varchar(255) DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT '0' COMMENT 'Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)',
  `id_cadastros` int(10) unsigned NOT NULL,
  `id_tipo` int(10) unsigned NOT NULL,
  `documento` varchar(255) NOT NULL COMMENT 'Número do documento',
  `emissao` varchar(255) DEFAULT NULL COMMENT 'Data de emissão',
  `validade` varchar(255) DEFAULT NULL COMMENT 'Data de validade',
  `obs` varchar(255) DEFAULT NULL COMMENT 'Observações do documento',
  PRIMARY KEY (`id`),
  KEY `vivazul_cliente_dominio_cad_documentos_id_cadastros_foreign` (`id_cadastros`),
  KEY `vivazul_cliente_dominio_cad_documentos_id_tipo_foreign` (`id_tipo`),
  CONSTRAINT `vivazul_cliente_dominio_cad_documentos_id_cadastros_foreign` FOREIGN KEY (`id_cadastros`) REFERENCES `cadastros` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT `vivazul_cliente_dominio_cad_documentos_id_tipo_foreign` FOREIGN KEY (`id_tipo`) REFERENCES `local_params` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/*Table structure for table `cad_enderecos` */

DROP TABLE IF EXISTS `cad_enderecos`;

CREATE TABLE `cad_enderecos` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `evento` int(11) NOT NULL,
  `created_at` varchar(255) NOT NULL,
  `updated_at` varchar(255) DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT '0' COMMENT 'Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)',
  `id_cadastros` int(10) unsigned NOT NULL,
  `id_tipo` int(10) unsigned NOT NULL,
  `cep` varchar(8) NOT NULL COMMENT 'Cep',
  `logradouro` varchar(255) NOT NULL COMMENT 'Logradouro',
  `nr` varchar(255) NOT NULL COMMENT 'Número',
  `complnr` varchar(255) DEFAULT NULL COMMENT 'Complemento',
  `bairro` varchar(255) DEFAULT NULL COMMENT 'Bairro',
  `cidade` varchar(255) NOT NULL COMMENT 'Cidade',
  `uf` varchar(2) NOT NULL COMMENT 'Estado',
  `ibge` varchar(8) DEFAULT NULL COMMENT 'IBGE',
  `geo_ltd` varchar(255) DEFAULT NULL COMMENT 'Geo. latd',
  `geo_lng` varchar(255) DEFAULT NULL COMMENT 'Geo. lng',
  `obs` varchar(255) DEFAULT NULL COMMENT 'Observações do endereço',
  PRIMARY KEY (`id`),
  KEY `vivazul_cliente_dominio_cad_enderecos_id_cadastros_foreign` (`id_cadastros`),
  KEY `vivazul_cliente_dominio_cad_enderecos_id_tipo_foreign` (`id_tipo`),
  CONSTRAINT `vivazul_cliente_dominio_cad_enderecos_id_cadastros_foreign` FOREIGN KEY (`id_cadastros`) REFERENCES `cadastros` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT `vivazul_cliente_dominio_cad_enderecos_id_tipo_foreign` FOREIGN KEY (`id_tipo`) REFERENCES `local_params` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/*Table structure for table `cadastros` */

DROP TABLE IF EXISTS `cadastros`;

CREATE TABLE `cadastros` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `evento` int(11) NOT NULL,
  `created_at` varchar(255) NOT NULL,
  `updated_at` varchar(255) DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT '0' COMMENT 'Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)',
  `prospect` int(1) NOT NULL DEFAULT 1 COMMENT 'Prospecto (Não: 0; Sim: 1)',
  `id_params_tipo` int(10) unsigned NOT NULL COMMENT 'Tipo de cliente (Arquiteto, Cliente, Fornecedor)',
  `id_params_atuacao` int(10) unsigned NOT NULL COMMENT 'Área de atuação (Chave estrangeira com a tabela CLI_DOM.local_params)',
  `cpf_cnpj` varchar(255) NOT NULL COMMENT 'CPF ou CNPJ',
  `rg_ie` varchar(255) DEFAULT NULL COMMENT 'RG(PF) ou Inscrição Estadual(PJ)',
  `nome` varchar(255) NOT NULL COMMENT 'Nome ou razão social',
  `id_params_sexo` int(10) unsigned NOT NULL COMMENT 'Sexo(apenas PF) (Masc: 0; Fem: 1; Outro: 2)',
  `aniversario` varchar(255) DEFAULT NULL COMMENT 'Nascimento(PF) | Fundação(PJ)',
  `id_params_p_nascto` int(10) unsigned DEFAULT NULL COMMENT 'Nacionalidade',
  `observacao` varchar(2500) DEFAULT NULL COMMENT 'Observações do cliente',
  `telefone` varchar(11) DEFAULT NULL COMMENT 'Primeiro telefone',
  `email` varchar(250) DEFAULT NULL COMMENT 'Primeiro email',
  `old_id` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `vivazul_cliente_dominio_cadastros_cpf_cnpj_unique` (`cpf_cnpj`),
  KEY `vivazul_cliente_dominio_cadastros_id_atuacao_foreign` (`id_params_atuacao`),
  KEY `vivazul_cliente_dominio_cadastros_tipo_foreign` (`id_params_tipo`),
  KEY `vivazul_cliente_dominio_cadastros_sexo_foreign` (`id_params_sexo`),
  KEY `vivazul_cliente_dominio_cadastros_nacionalidade_foreign` (`id_params_p_nascto`),
  CONSTRAINT `vivazul_cliente_dominio_cadastros_id_atuacao_foreign` FOREIGN KEY (`id_params_atuacao`) REFERENCES `local_params` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT `vivazul_cliente_dominio_cadastros_nacionalidade_foreign` FOREIGN KEY (`id_params_p_nascto`) REFERENCES `vivazul_api`.`params` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT `vivazul_cliente_dominio_cadastros_sexo_foreign` FOREIGN KEY (`id_params_sexo`) REFERENCES `vivazul_api`.`params` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT `vivazul_cliente_dominio_cadastros_tipo_foreign` FOREIGN KEY (`id_params_tipo`) REFERENCES `local_params` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=53724 DEFAULT CHARSET=utf8mb4;

/*Table structure for table `com_agentes` */

DROP TABLE IF EXISTS `com_agentes`;

CREATE TABLE `com_agentes` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `evento` int(11) NOT NULL,
  `created_at` varchar(255) NOT NULL,
  `updated_at` varchar(255) DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT '0' COMMENT 'Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)',
  `ordem` varchar(3) DEFAULT NULL COMMENT 'Número identificador próprio',
  `id_cadastros` int(10) unsigned NOT NULL COMMENT 'Registro no cadastro',
  `dsr` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Recebe DSR',
  `observacao` decimal(10,2) DEFAULT NULL COMMENT 'Observação do registro',
  PRIMARY KEY (`id`),
  KEY `vivazul_cliente_dominio_com_agentes_id_cadastros_foreign` (`id_cadastros`),
  CONSTRAINT `vivazul_cliente_dominio_com_agentes_id_cadastros_foreign` FOREIGN KEY (`id_cadastros`) REFERENCES `cadastros` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/*Table structure for table `com_terceiros` */

DROP TABLE IF EXISTS `com_terceiros`;

CREATE TABLE `com_terceiros` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `evento` int(11) NOT NULL,
  `created_at` varchar(255) NOT NULL,
  `updated_at` varchar(255) DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT '0' COMMENT 'Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)',
  `id_ged` int(11) unsigned NOT NULL COMMENT 'Documento relacionado ',
  `id_com_agentes` int(11) unsigned NOT NULL COMMENT 'Agente',
  `terceiro` tinyint(1) DEFAULT NULL COMMENT 'Se um terceiro',
  `valor_base` decimal(10,2) DEFAULT NULL COMMENT 'Valor base de cálculo da comissão',
  `participacao` decimal(10,2) DEFAULT NULL COMMENT 'Percentual de comissão',
  `liquidacao` varchar(255) DEFAULT NULL COMMENT 'Data da liquidação',
  PRIMARY KEY (`id`),
  KEY `vivazul_cliente_dominio_com_terceiros_id_ged_foreign` (`id_ged`),
  KEY `vivazul_cliente_dominio_com_terceiros_id_com_agentes_foreign` (`id_com_agentes`),
  CONSTRAINT `vivazul_cliente_dominio_com_terceiros_id_com_agentes_foreign` FOREIGN KEY (`id_com_agentes`) REFERENCES `com_agentes` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT `vivazul_cliente_dominio_com_terceiros_id_ged_foreign` FOREIGN KEY (`id_ged`) REFERENCES `ged` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/*Table structure for table `empresa` */

DROP TABLE IF EXISTS `empresa`;

CREATE TABLE `empresa` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `evento` int(11) NOT NULL,
  `created_at` varchar(255) NOT NULL,
  `updated_at` varchar(255) DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT '0' COMMENT 'Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)',
  `dominio` varchar(255) NOT NULL COMMENT 'Domínio do cliente',
  `razaosocial` varchar(255) DEFAULT NULL COMMENT 'Razão social do cadastro',
  `fantasia` varchar(255) DEFAULT NULL COMMENT 'Nome fantasia da empresa',
  `cpf_cnpj_empresa` varchar(255) DEFAULT NULL COMMENT 'CNPJ do cadastro',
  `ie` varchar(255) DEFAULT NULL COMMENT 'Inscrição estadual',
  `ie_st` varchar(255) DEFAULT NULL COMMENT 'Inscrição estadual do substituto tributário',
  `im` varchar(255) DEFAULT NULL COMMENT 'nscrição municipal',
  `cnae` varchar(255) DEFAULT NULL COMMENT 'CNAE',
  `cep` varchar(8) NOT NULL COMMENT 'Cep',
  `logradouro` varchar(255) NOT NULL COMMENT 'Logradouro',
  `nr` varchar(255) NOT NULL COMMENT 'Número',
  `complnr` varchar(255) DEFAULT NULL COMMENT 'Complemento',
  `bairro` varchar(255) DEFAULT NULL COMMENT 'Bairro',
  `cidade` varchar(255) NOT NULL COMMENT 'Cidade',
  `uf` varchar(2) NOT NULL COMMENT 'Estado',
  `ibge` varchar(8) DEFAULT NULL COMMENT 'IBGE',
  `geo_ltd` varchar(255) DEFAULT NULL COMMENT 'Geo. latd',
  `geo_lng` varchar(255) DEFAULT NULL COMMENT 'Geo. lng',
  `contato` text DEFAULT NULL COMMENT 'Contato da empresa',
  `tel1` text DEFAULT NULL COMMENT 'Telefone 1',
  `tel2` varchar(255) DEFAULT NULL COMMENT 'Telefone 2',
  `email` varchar(255) DEFAULT NULL COMMENT 'Email geral',
  `emailAt` varchar(255) DEFAULT NULL COMMENT 'Email da At',
  `emailComercial` varchar(255) DEFAULT NULL COMMENT 'Email comercial',
  `emailFinanceiro` varchar(255) DEFAULT NULL COMMENT 'Email do financeiro',
  `emailRH` varchar(255) DEFAULT NULL COMMENT 'Email do RH',
  `id_cadas_resplegal` int(10) unsigned DEFAULT NULL COMMENT 'Responsável legal perante a Receita Federal',
  `url_logo` text DEFAULT NULL COMMENT 'Logomarca da empresa',
  PRIMARY KEY (`id`),
  UNIQUE KEY `vivazul_cliente_dominio_empresa_dominio_unique` (`dominio`),
  KEY `vivazul_cliente_dominio_empresa_id_cadas_resplegal_foreign` (`id_cadas_resplegal`),
  CONSTRAINT `vivazul_cliente_dominio_empresa_id_cadas_resplegal_foreign` FOREIGN KEY (`id_cadas_resplegal`) REFERENCES `cadastros` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/*Table structure for table `fin_cc` */

DROP TABLE IF EXISTS `fin_cc`;

CREATE TABLE `fin_cc` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `evento` int(11) NOT NULL,
  `created_at` varchar(255) NOT NULL,
  `updated_at` varchar(255) DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT '0' COMMENT 'Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)',
  `codigo` varchar(255) NOT NULL COMMENT 'Código da despesa ou receita',
  `tipo` char(1) NOT NULL COMMENT 'Despesa ou receita',
  `descricao` varchar(50) NOT NULL COMMENT 'Descrição do centro de custo',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/*Table structure for table `fin_lancamentos` */

DROP TABLE IF EXISTS `fin_lancamentos`;

CREATE TABLE `fin_lancamentos` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `evento` int(11) NOT NULL,
  `created_at` varchar(255) NOT NULL,
  `updated_at` varchar(255) DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT '0' COMMENT 'Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)',
  `tp_cta` char(1) DEFAULT NULL COMMENT '+=Receber;-=Pagar',
  `id_empresa` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Codigo relacional com a tabela sis_demp',
  `id_cadastros` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Codigo relacional com a tabela de cadastros',
  `id_centro_custo` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Codigo relacional com a tabela fin_centro_custo',
  `tipoDocumento` varchar(255) DEFAULT NULL COMMENT 'Documento gerado: CF, NF-e, NFS-e',
  `doc_fiscal` varchar(255) DEFAULT '0' COMMENT 'Nota fiscal do lancamento',
  `data_lanc` char(10) DEFAULT NULL COMMENT 'Data do lancamento da conta no sistema',
  `data_vencimento` char(10) DEFAULT NULL COMMENT 'Data de vencimento programado para a conta',
  `data_pagto` char(10) DEFAULT NULL COMMENT 'Data real que aconteceu o pagamento',
  `valor_bruto` double(11,2) DEFAULT 0.00 COMMENT 'Valor bruto da conta',
  `valor_bruto_nf` double(11,2) DEFAULT 0.00 COMMENT 'Valor bruto da nota fiscal',
  `valor_retencao` double(11,2) DEFAULT 0.00 COMMENT 'Valor da retenção. Este campo será impresso na duplicata.',
  `valor_liquido` double(11,2) DEFAULT 0.00 COMMENT 'Valor liquido da conta',
  `descricao_retencao` varchar(250) DEFAULT NULL COMMENT 'Descrição abreviada do motivo da retencao. Este campo será impresso na duplicata.',
  `valor_vencimentos` double(11,2) DEFAULT 0.00 COMMENT 'Valor bruto da conta',
  `valor_nota_fiscal` double(11,2) DEFAULT 0.00 COMMENT 'Valor total da nota fiscal para impressão na duplicata',
  `duplicata` varchar(255) DEFAULT NULL COMMENT 'Duplicata da conta gerada no faturamento',
  `duplicata_impr` int(1) DEFAULT 0 COMMENT 'Quantidade de vezes que a duplicata foi impresso',
  `descricao_conta` varchar(100) DEFAULT NULL COMMENT 'Descrição da conta',
  `obs_da_conta` varchar(2500) DEFAULT NULL COMMENT 'Observacao da conta',
  `vencimento` varchar(3) DEFAULT NULL COMMENT 'Parcela da conta. Ex.',
  `forma_pagto` varchar(255) DEFAULT NULL COMMENT 'Forma de pagamento utilizada',
  `doc_pagto` varchar(255) DEFAULT NULL COMMENT 'Documento que quitou o pagamento',
  `situacao` char(1) DEFAULT '0' COMMENT 'Situacao:-1-Ainda não é considerado duplicata pois não foi impresso;0-Todos;1-Pendente;2-Cancelado;3-Quitado;4-Conciliado',
  `motiv_cancel` varchar(255) DEFAULT NULL COMMENT 'Caso situacao=2 descrever o motivo do cancelamento',
  PRIMARY KEY (`id`),
  KEY `vivazul_cliente_dominio_fin_lancamentos_id_cadastros_foreign` (`id_cadastros`),
  KEY `vivazul_cliente_dominio_fin_lancamentos_id_empresa_foreign` (`id_empresa`),
  KEY `vivazul_cliente_dominio_fin_lancamentos_id_centro_custo_foreign` (`id_centro_custo`),
  CONSTRAINT `vivazul_cliente_dominio_fin_lancamentos_id_cadastros_foreign` FOREIGN KEY (`id_cadastros`) REFERENCES `cadastros` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT `vivazul_cliente_dominio_fin_lancamentos_id_centro_custo_foreign` FOREIGN KEY (`id_centro_custo`) REFERENCES `fin_cc` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT `vivazul_cliente_dominio_fin_lancamentos_id_empresa_foreign` FOREIGN KEY (`id_empresa`) REFERENCES `empresa` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/*Table structure for table `fin_retencoes` */

DROP TABLE IF EXISTS `fin_retencoes`;

CREATE TABLE `fin_retencoes` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `evento` int(11) NOT NULL,
  `created_at` varchar(255) NOT NULL,
  `updated_at` varchar(255) DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT '0' COMMENT 'Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)',
  `id_fin_lanc` int(10) unsigned NOT NULL COMMENT 'Chave estrangeira com a tabela fin_lancamentos',
  `valor` double(11,2) DEFAULT 0.00 COMMENT 'Valor da retenção',
  `Valor da retenção` varchar(250) DEFAULT '0' COMMENT 'Descrição da retenção',
  PRIMARY KEY (`id`),
  KEY `vivazul_cliente_dominio_fin_retencoes_id_fin_lanc_foreign` (`id_fin_lanc`),
  CONSTRAINT `vivazul_cliente_dominio_fin_retencoes_id_fin_lanc_foreign` FOREIGN KEY (`id_fin_lanc`) REFERENCES `fin_lancamentos` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/*Table structure for table `ged` */

DROP TABLE IF EXISTS `ged`;

CREATE TABLE `ged` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `evento` int(11) NOT NULL,
  `created_at` varchar(255) NOT NULL,
  `updated_at` varchar(255) DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT '0' COMMENT 'Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)',
  `id_ged_params` int(10) unsigned NOT NULL COMMENT 'Parâmetro',
  `id_ged_pai` int(10) unsigned DEFAULT NULL COMMENT 'Documento pai',
  `id_ged_filho` int(10) unsigned DEFAULT NULL COMMENT 'Documento filho',
  `id_cadastros` int(10) unsigned NOT NULL COMMENT 'Cliente ',
  `id_com_agentes` int(10) unsigned DEFAULT NULL COMMENT 'Agente de vendas do atendimento',
  `status_comissao` varchar(255) DEFAULT NULL COMMENT 'Status da comissão',
  `documento` varchar(255) DEFAULT '0' COMMENT 'Data da liquidação',
  `versao` int(2) DEFAULT 0 COMMENT 'Versão',
  `descricao` varchar(2500) DEFAULT NULL COMMENT 'Descrição abreviada do documento',
  `valor_bruto` decimal(10,2) DEFAULT 0.00 COMMENT 'Valor do documento',
  `valor_liq` decimal(10,2) DEFAULT 0.00 COMMENT 'Valor liquido do documento',
  `valor_representacao` decimal(10,2) DEFAULT 0.00 COMMENT 'Valor base de comissionamento da representação ',
  `perc_represent` decimal(10,2) DEFAULT 0.00 COMMENT 'Percentual de comissão da representação',
  `valor_agente` decimal(10,2) DEFAULT 0.00 COMMENT 'Valor base de comissionamento dos agentes',
  PRIMARY KEY (`id`),
  KEY `vivazul_cliente_dominio_ged_id_ged_params_foreign` (`id_ged_params`),
  KEY `vivazul_cliente_dominio_ged_id_cadastros_foreign` (`id_cadastros`),
  CONSTRAINT `vivazul_cliente_dominio_ged_id_cadastros_foreign` FOREIGN KEY (`id_cadastros`) REFERENCES `cadastros` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT `vivazul_cliente_dominio_ged_id_ged_params_foreign` FOREIGN KEY (`id_ged_params`) REFERENCES `ged_params` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/*Table structure for table `ged_params` */

DROP TABLE IF EXISTS `ged_params`;

CREATE TABLE `ged_params` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `evento` int(11) NOT NULL,
  `created_at` varchar(255) NOT NULL,
  `updated_at` varchar(255) DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT '0' COMMENT 'Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)',
  `descricao` varchar(50) DEFAULT NULL COMMENT 'select,insert,update,references  Descrição abreviada do parâmetro',
  `bi_index` tinyint(1) DEFAULT 0 COMMENT 'select,insert,update,references  Apresentação em BI',
  `doc_venda` tinyint(1) DEFAULT 0 COMMENT 'select,insert,update,references  É documento de venda',
  `autom_nr` tinyint(1) DEFAULT 0 COMMENT 'select,insert,update,references  Numeracao automatica',
  `gera_baixa` tinyint(1) DEFAULT 0 COMMENT 'select,insert,update,references  Pode ser convertido em pedido',
  `tipo_secundario` tinyint(1) DEFAULT 0 COMMENT 'select,insert,update,references  Tipo secundário',
  `obrig_valor` tinyint(1) DEFAULT 0 COMMENT 'select,insert,update,references  Obrigatorio declarar valor',
  `reg_agente` tinyint(1) DEFAULT 0 COMMENT 'select,insert,update,references  Obrigatório agente ',
  `id_logo` varchar(255) DEFAULT '0' COMMENT 'select,insert,update,references  URL logomarca representada',
  `gera_pasta` tinyint(1) DEFAULT 0 COMMENT 'select,insert,update,references  Gera pasta(0=Não, 1=Documento, 2=documento_baixa)',
  `proposta_interna` tinyint(1) DEFAULT 0 COMMENT 'select,insert,update,references  Utiliza o sistema de proposta interna',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/*Table structure for table `ged_protolo` */

DROP TABLE IF EXISTS `ged_protolo`;

CREATE TABLE `ged_protolo` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `evento` int(11) NOT NULL,
  `created_at` varchar(255) NOT NULL,
  `updated_at` varchar(255) DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT '0' COMMENT 'Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)',
  `id_cadastros` int(10) unsigned NOT NULL COMMENT 'Registro do Destinatário no cadastro',
  `email_destinatario` varchar(255) DEFAULT NULL COMMENT 'Destinatário(email)',
  `registro` varchar(255) DEFAULT NULL COMMENT 'Número do protocolo',
  `titulo` varchar(255) DEFAULT NULL COMMENT 'Port',
  `e_s` varchar(255) DEFAULT NULL COMMENT 'Movimento',
  `descricao` varchar(255) DEFAULT NULL COMMENT 'Descrição do documento',
  PRIMARY KEY (`id`),
  KEY `vivazul_cliente_dominio_ged_protolo_id_cadastros_foreign` (`id_cadastros`),
  CONSTRAINT `vivazul_cliente_dominio_ged_protolo_id_cadastros_foreign` FOREIGN KEY (`id_cadastros`) REFERENCES `cadastros` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/*Table structure for table `ged_status` */

DROP TABLE IF EXISTS `ged_status`;

CREATE TABLE `ged_status` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `evento` int(11) NOT NULL,
  `created_at` varchar(255) NOT NULL,
  `updated_at` varchar(255) DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT '0' COMMENT 'Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)',
  `id_ged` int(10) unsigned DEFAULT NULL COMMENT 'Documento pai',
  `status_params` int(10) unsigned NOT NULL COMMENT 'Status do documento-+',
  PRIMARY KEY (`id`),
  KEY `vivazul_cliente_dominio_ged_status_id_ged_foreign` (`id_ged`),
  CONSTRAINT `vivazul_cliente_dominio_ged_status_id_ged_foreign` FOREIGN KEY (`id_ged`) REFERENCES `ged` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/*Table structure for table `local_params` */

DROP TABLE IF EXISTS `local_params`;

CREATE TABLE `local_params` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `evento` int(11) NOT NULL,
  `created_at` varchar(255) NOT NULL,
  `updated_at` varchar(255) DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT '0',
  `grupo` varchar(255) DEFAULT NULL COMMENT 'Grupo do parâmetro',
  `parametro` varchar(1000) DEFAULT NULL COMMENT 'Parâmetro',
  `label` varchar(1000) DEFAULT NULL COMMENT 'Label',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=42 DEFAULT CHARSET=utf8mb4;

/*Table structure for table `pv` */

DROP TABLE IF EXISTS `pv`;

CREATE TABLE `pv` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `evento` int(11) NOT NULL,
  `created_at` varchar(255) NOT NULL,
  `updated_at` varchar(255) DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT '0' COMMENT 'Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)',
  `id_cadastros` int(10) unsigned NOT NULL COMMENT 'Cliente',
  `id_ged` int(10) unsigned DEFAULT NULL COMMENT 'Ged',
  `tipo` int(1) NOT NULL DEFAULT 0 COMMENT 'Tipo de pv (SUPORTE:0; MONTAGEM:1)',
  `pv_nr` varchar(255) DEFAULT NULL COMMENT 'Número do PV',
  `obs` text DEFAULT NULL COMMENT 'Observação',
  `situacao` char(2) NOT NULL COMMENT 'Situação do pós atendimento',
  PRIMARY KEY (`id`),
  KEY `vivazul_cliente_dominio_pv_id_cadastros_foreign` (`id_cadastros`),
  KEY `vivazul_cliente_dominio_pv_id_ged_foreign` (`id_ged`),
  CONSTRAINT `vivazul_cliente_dominio_pv_id_cadastros_foreign` FOREIGN KEY (`id_cadastros`) REFERENCES `cadastros` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT `vivazul_cliente_dominio_pv_id_ged_foreign` FOREIGN KEY (`id_ged`) REFERENCES `ged` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/*Table structure for table `pv_oat` */

DROP TABLE IF EXISTS `pv_oat`;

CREATE TABLE `pv_oat` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `evento` int(11) NOT NULL,
  `created_at` varchar(255) NOT NULL,
  `updated_at` varchar(255) DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT '0' COMMENT 'Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)',
  `id_pv` int(10) unsigned NOT NULL COMMENT 'ID do pv',
  `id_cadastro_endereco` int(10) unsigned NOT NULL COMMENT 'Endereço do atendimento',
  `id_tecnico` int(10) unsigned DEFAULT NULL COMMENT 'Técnico responsável',
  `nr_oat` int(3) NOT NULL COMMENT 'OAT',
  `int_ext` int(10) NOT NULL COMMENT 'Interno/Externo',
  `garantia` int(1) NOT NULL COMMENT 'Garantia',
  `nf_garantia` varchar(255) DEFAULT NULL COMMENT 'Nota fiscal do produto',
  `pessoa_contato` varchar(255) NOT NULL COMMENT 'Contato no cliente',
  `telefone_contato` varchar(255) NOT NULL COMMENT 'Telefone do contato',
  `email_contato` varchar(255) DEFAULT NULL COMMENT 'Email do contato',
  `descricao` text DEFAULT NULL COMMENT 'Descrição dos serviços',
  `valor_total` decimal(10,2) DEFAULT NULL COMMENT 'Valor dos serviços',
  `aceite_do_cliente` varchar(255) DEFAULT NULL COMMENT 'Data do aceite',
  PRIMARY KEY (`id`),
  KEY `vivazul_cliente_dominio_pv_oat_id_pv_foreign` (`id_pv`),
  KEY `vivazul_cliente_dominio_pv_oat_id_cadastro_endereco_foreign` (`id_cadastro_endereco`),
  KEY `vivazul_cliente_dominio_pv_oat_id_tecnico_foreign` (`id_tecnico`),
  CONSTRAINT `vivazul_cliente_dominio_pv_oat_id_cadastro_endereco_foreign` FOREIGN KEY (`id_cadastro_endereco`) REFERENCES `ged_params` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT `vivazul_cliente_dominio_pv_oat_id_pv_foreign` FOREIGN KEY (`id_pv`) REFERENCES `pv` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT `vivazul_cliente_dominio_pv_oat_id_tecnico_foreign` FOREIGN KEY (`id_tecnico`) REFERENCES `pv_tecnicos` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/*Table structure for table `pv_tecnicos` */

DROP TABLE IF EXISTS `pv_tecnicos`;

CREATE TABLE `pv_tecnicos` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `evento` int(11) NOT NULL,
  `created_at` varchar(255) NOT NULL,
  `updated_at` varchar(255) DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT '0' COMMENT 'Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)',
  `tecnico` varchar(255) DEFAULT NULL COMMENT 'Técnico responsável',
  `telefone_contato` varchar(255) NOT NULL COMMENT 'Telefone do contato',
  `email_contato` varchar(255) DEFAULT NULL COMMENT 'Email do contato',
  `observacao` text DEFAULT NULL COMMENT 'Descrição dos serviços',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
