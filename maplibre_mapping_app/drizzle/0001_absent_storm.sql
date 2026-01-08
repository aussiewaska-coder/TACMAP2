CREATE TABLE `custom_layers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`layerId` varchar(100) NOT NULL,
	`layerName` varchar(200) NOT NULL,
	`description` text,
	`layerType` enum('geojson','raster','vector','heatmap','cluster') NOT NULL,
	`dataSource` text,
	`styleConfig` json,
	`visible` boolean NOT NULL DEFAULT true,
	`opacity` int NOT NULL DEFAULT 100,
	`zIndex` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `custom_layers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `map_features` (
	`id` int AUTO_INCREMENT NOT NULL,
	`featureKey` varchar(100) NOT NULL,
	`featureName` varchar(200) NOT NULL,
	`description` text,
	`enabled` boolean NOT NULL DEFAULT true,
	`category` enum('plugin','control','layer','example') NOT NULL,
	`config` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `map_features_id` PRIMARY KEY(`id`),
	CONSTRAINT `map_features_featureKey_unique` UNIQUE(`featureKey`)
);
--> statement-breakpoint
CREATE TABLE `map_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`centerLat` varchar(50) NOT NULL DEFAULT '-25.2744',
	`centerLng` varchar(50) NOT NULL DEFAULT '133.7751',
	`zoom` int NOT NULL DEFAULT 4,
	`pitch` int NOT NULL DEFAULT 0,
	`bearing` int NOT NULL DEFAULT 0,
	`activeStyleId` varchar(100) NOT NULL DEFAULT 'streets',
	`layerVisibility` json,
	`layerOpacity` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `map_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `map_styles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`styleId` varchar(100) NOT NULL,
	`styleName` varchar(200) NOT NULL,
	`description` text,
	`styleUrl` text NOT NULL,
	`thumbnailUrl` text,
	`enabled` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `map_styles_id` PRIMARY KEY(`id`),
	CONSTRAINT `map_styles_styleId_unique` UNIQUE(`styleId`)
);
