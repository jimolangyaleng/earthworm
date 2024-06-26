import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { and, eq } from "drizzle-orm";
import * as request from "supertest";

import { userCourseProgress } from "@earthworm/schema";
import { insertUserCourseProgress } from "../../../test/fixture/db";
import { cleanDB, signin } from "../../../test/helper/utils";
import { AppModule } from "../../app/app.module";
import { appGlobalMiddleware } from "../../app/useGlobal";
import { endDB } from "../../common/db";
import { DB, DbType } from "../../global/providers/db.provider";

describe("user-progress e2e", () => {
  let app: INestApplication;
  let db: DbType;
  let token: string;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    appGlobalMiddleware(app);
    db = moduleFixture.get<DbType>(DB);

    await app.init();

    await cleanDB(db);

    token = await signin(moduleFixture);
  });

  afterEach(async () => {
    await cleanDB(db);
    await endDB();
    await app.close();
  });

  it("get: /user-course-progress/recent-course-packs", async () => {
    await insertUserCourseProgress(db, 1, 1, 0);
    const userCourseProgressFirst = await insertUserCourseProgress(db, 1, 2, 10);
    const userCourseProgressSecond = await insertUserCourseProgress(db, 2, 2, 100);

    await request(app.getHttpServer())
      .get("/user-course-progress/recent-course-packs")
      .set("Authorization", `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.length).toBe(2);
        expect(body[0].id).toBe(userCourseProgressFirst.id);
        expect(body[1].id).toBe(userCourseProgressSecond.id);
      });
  });

  it("put: /user-course-progress", async () => {
    const coursePackId = 1;
    const courseId = 1;
    await insertUserCourseProgress(db, coursePackId, courseId, 1);

    await request(app.getHttpServer())
      .put("/user-course-progress")
      .send({
        courseId,
        coursePackId,
        statementIndex: 10,
      })
      .set("Authorization", `Bearer ${token}`)
      .expect(200)
      .expect(async () => {
        const result = await db.query.userCourseProgress.findFirst({
          where: and(
            eq(userCourseProgress.coursePackId, coursePackId),
            eq(userCourseProgress.courseId, courseId),
          ),
        });

        expect(result).toBeTruthy();
      });
  });
});
