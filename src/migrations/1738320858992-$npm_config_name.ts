import { MigrationInterface, QueryRunner } from "typeorm";

export class  $npmConfigName1738320858992 implements MigrationInterface {
    name = ' $npmConfigName1738320858992'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "username" character varying NOT NULL, "password" character varying NOT NULL, "email" character varying NOT NULL, "isAdmin" boolean NOT NULL DEFAULT false, "isDeleted" boolean NOT NULL DEFAULT false, "roles" text array NOT NULL DEFAULT '{user}', "isVerified" boolean NOT NULL DEFAULT false, "verificationCode" character varying, "verificationCodeExpires" TIMESTAMP, "resetPasswordToken" character varying, "resetPasswordExpires" TIMESTAMP, "profilePicture" character varying NOT NULL DEFAULT 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png', "latitude" numeric, "longitude" numeric, "failedLoginAttempts" integer NOT NULL DEFAULT '0', "lockUntil" TIMESTAMP, "mobileNumber" character varying NOT NULL, "refreshToken" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username"), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "UQ_61dc14c8c49c187f5d08047c985" UNIQUE ("mobileNumber"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "query-result-cache" ("id" SERIAL NOT NULL, "identifier" character varying, "time" bigint NOT NULL, "duration" integer NOT NULL, "query" text NOT NULL, "result" text NOT NULL, CONSTRAINT "PK_6a98f758d8bfd010e7e10ffd3d3" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "query-result-cache"`);
        await queryRunner.query(`DROP TABLE "users"`);
    }

}
