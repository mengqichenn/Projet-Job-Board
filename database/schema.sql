CREATE TABLE `entreprises` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `nom` varchar(150) NOT NULL,
  `description` text,
  `site_web` varchar(255),
  `ville` varchar(100),
  `cree_le` datetime DEFAULT (now()),
  `modifie_le` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE `categories` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `nom` varchar(100) UNIQUE NOT NULL
);

CREATE TABLE `personnes` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `prenom` varchar(100) NOT NULL,
  `nom` varchar(100) NOT NULL,
  `email` varchar(150) UNIQUE NOT NULL,
  `telephone` varchar(30),
  `mot_de_passe` varchar(255) NOT NULL,
  `role` ENUM ('candidat', 'employeur', 'administrateur') NOT NULL DEFAULT 'candidat',
  `entreprise_id` int,
  `cree_le` datetime DEFAULT (now()),
  `modifie_le` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE `annonces` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `titre` varchar(150) NOT NULL,
  `description_courte` varchar(255) NOT NULL,
  `description_complete` text NOT NULL,
  `salaire` decimal(10,2),
  `lieu` varchar(150),
  `temps_travail` varchar(100),
  `type_contrat` ENUM ('cdi', 'cdd', 'stage', 'alternance', 'interim') NOT NULL,
  `niveau_etude` ENUM ('bac', 'bac_2', 'bac_3', 'bac_5'),
  `experience` ENUM ('moins_1_an', 'de_1_a_3_ans', 'de_3_a_5_ans', 'plus_5_ans'),
  `date_debut` date,
  `mode_travail` ENUM ('teletravail', 'hybride', 'sur_site') NOT NULL DEFAULT 'sur_site',
  `statut` ENUM ('active', 'fermee') NOT NULL DEFAULT 'active',
  `publie_le` datetime DEFAULT (now()),
  `expire_le` datetime,
  `entreprise_id` int NOT NULL,
  `categorie_id` int NOT NULL,
  `employeur_id` int NOT NULL,
  `cree_le` datetime DEFAULT (now()),
  `modifie_le` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE `candidatures` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `personne_id` int NOT NULL,
  `annonce_id` int NOT NULL,
  `message` text NOT NULL,
  `statut` ENUM ('en_attente', 'acceptee', 'refusee') NOT NULL DEFAULT 'en_attente',
  `postule_le` datetime DEFAULT (now())
);

CREATE TABLE `messages` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `candidature_id` int NOT NULL,
  `employeur_id` int NOT NULL,
  `email_destinataire` varchar(150) NOT NULL,
  `objet` varchar(255) NOT NULL,
  `contenu` text NOT NULL,
  `envoye_le` datetime DEFAULT (now()),
  `statut` ENUM ('envoye', 'echoue') NOT NULL DEFAULT 'envoye'
);

CREATE UNIQUE INDEX `candidatures_index_0` ON `candidatures` (`personne_id`, `annonce_id`);

ALTER TABLE `personnes` ADD FOREIGN KEY (`entreprise_id`) REFERENCES `entreprises` (`id`);

ALTER TABLE `annonces` ADD FOREIGN KEY (`entreprise_id`) REFERENCES `entreprises` (`id`);

ALTER TABLE `annonces` ADD FOREIGN KEY (`categorie_id`) REFERENCES `categories` (`id`);

ALTER TABLE `annonces` ADD FOREIGN KEY (`employeur_id`) REFERENCES `personnes` (`id`);

ALTER TABLE `candidatures` ADD FOREIGN KEY (`personne_id`) REFERENCES `personnes` (`id`);

ALTER TABLE `candidatures` ADD FOREIGN KEY (`annonce_id`) REFERENCES `annonces` (`id`) ON DELETE CASCADE;

ALTER TABLE `messages` ADD FOREIGN KEY (`candidature_id`) REFERENCES `candidatures` (`id`) ON DELETE CASCADE;

ALTER TABLE `messages` ADD FOREIGN KEY (`employeur_id`) REFERENCES `personnes` (`id`);
