require("dotenv").config();
const { Builder, Browser, By, until } = require("selenium-webdriver");
const xlsx = require("json-as-xlsx");

async function getProspects() {
  let driver = await new Builder().forBrowser(Browser.CHROME).build();
  try {
    await driver.get("https://app.vaam.io");
    await driver.manage().window().setRect({ width: 1512, height: 860 });
    await driver.findElement(By.id("email")).click();
    await driver.findElement(By.id("email")).sendKeys(process.env.VAAM_EMAIL);
    await driver.findElement(By.id("password")).click();
    await driver
      .findElement(By.id("password"))
      .sendKeys(process.env.VAAM_PASSWORD);
    await driver.findElement(By.id("btn-login")).click();

    //wait for the page to load
    await driver.wait(until.titleIs("Vaam | Outreach Dashboard"), 1000);

    //git prospect a tag
    const tags = await driver.findElements(By.tagName("a"));
    console.log({ links: tags.length });

    for (let i = 0; i < tags.length; i++) {
      const link = await tags[i].getAttribute("href");
      console.log({ link });
      if (link === "https://app.vaam.io/prospects") {
        await tags[i].click();
        break;
      }
    }

    //wait for the prospects page
    await driver.wait(until.titleIs("Vaam | Prospects"), 1000);

    //wait for the prospects list to load
    await fakePromise(5);

    //now we have prospects table
    const propsects = [];
    const prospectDetails = [];

    //getting the table with prospects
    const table = await driver.findElement(
      By.xpath(
        "/html/body/div/div/div[1]/div[2]/main/div[2]/div/div/div/div[2]/div/table"
      )
    );

    const trs = await table.findElements(By.tagName("tr"));

    console.log("total records ", trs.length);

    for (let i = 1; i < trs.length; i++) {
      const tds = await trs[i].findElements(By.tagName("td"));
      //checking if we have correct data in this row otherwise skip it
      const obj = {};
      for (let x = 0; x < tds.length; x++) {
        obj[x] = await tds[x].getText();
      }
      propsects.push(obj);

      //start click the row
      const button = await tds[0].findElement(By.tagName("button"));
      if (button) {
        console.log("Found a button");
        await button.click();
        await fakePromise(1);

        //get more details
        const detailedTable = await driver.findElement(
          By.xpath(
            "/html/body/div[3]/div/div/div/div[2]/section/div[2]/div/table"
          )
        );

        // const detailedTrs = await detailedTable.findElements(By.tagName("tr"));
        // console.log({ detailedTrs: detailedTrs.length });

        const firstName =
          (await detailedTable
            .findElement(
              By.xpath(
                "/html/body/div[3]/div/div/div/div[2]/section/div[2]/div/table/tbody/tr[1]/td[2]/input"
              )
            )
            .getAttribute("value")) || "";
        const lastName =
          (await detailedTable
            .findElement(
              By.xpath(
                "/html/body/div[3]/div/div/div/div[2]/section/div[2]/div/table/tbody/tr[2]/td[2]/input"
              )
            )
            .getAttribute("value")) || "";

        const phone =
          (await detailedTable
            .findElement(
              By.xpath(
                "/html/body/div[3]/div/div/div/div[2]/section/div[2]/div/table/tbody/tr[3]/td[2]/input"
              )
            )
            .getAttribute("value")) || "";

        const email =
          (await detailedTable
            .findElement(
              By.xpath(
                "/html/body/div[3]/div/div/div/div[2]/section/div[2]/div/table/tbody/tr[4]/td[2]/input"
              )
            )
            .getAttribute("value")) || "";

        const linkedInURL =
          (await detailedTable
            .findElement(
              By.xpath(
                "/html/body/div[3]/div/div/div/div[2]/section/div[2]/div/table/tbody/tr[5]/td[2]/input"
              )
            )
            .getAttribute("value")) || "";

        const companyName =
          (await detailedTable
            .findElement(
              By.xpath(
                "/html/body/div[3]/div/div/div/div[2]/section/div[2]/div/table/tbody/tr[6]/td[2]/input"
              )
            )
            .getAttribute("value")) || "";

        const jobTitle =
          (await detailedTable
            .findElement(
              By.xpath(
                "/html/body/div[3]/div/div/div/div[2]/section/div[2]/div/table/tbody/tr[7]/td[2]/input"
              )
            )
            .getAttribute("value")) || "";

        const website =
          (await detailedTable
            .findElement(
              By.xpath(
                "/html/body/div[3]/div/div/div/div[2]/section/div[2]/div/table/tbody/tr[8]/td[2]/input"
              )
            )
            .getAttribute("value")) || "";

        const custom =
          (await detailedTable
            .findElement(
              By.xpath(
                "/html/body/div[3]/div/div/div/div[2]/section/div[2]/div/table/tbody/tr[9]/td[2]/textarea"
              )
            )
            .getAttribute("value")) || "";

        //glab our data!
        prospectDetails.push({
          firstName,
          lastName,
          phone,
          email,
          linkedInURL,
          companyName,
          jobTitle,
          website,
          custom,
        });

        //close the pannel
        await driver.findElement(By.xpath("/html/body/div[3]/button")).click();

        //Nice, next job!
      }
    }

    console.log({ propsects });
    console.log({ prospectDetails });

    console.log(".....GENERATING EXCEL FILES....");

    //prepare excel data
    const prospectsExcellData = [
      {
        sheet: "Prospects list",
        columns: Object.keys(propsects[0]).map((item) => ({
          label: item,
          value: item,
        })),
        content: propsects,
      },
    ];

    xlsx(prospectsExcellData, {
      fileName: "prospects",
      writeMode: "writeFile", // The available parameters are 'WriteFile' and 'write'. This setting is optional. Useful in such cases https://docs.sheetjs.com/docs/solutions/output#example-remote-file
    });

    const prospectDetailsExcelData = [
      {
        sheet: "Prospects details",
        columns: Object.keys(prospectDetails[0]).map((item) => ({
          label: item,
          value: item,
        })),
        content: prospectDetails,
      },
    ];
    xlsx(prospectDetailsExcelData, {
      fileName: "prospects-details",
      writeMode: "writeFile", // The available parameters are 'WriteFile' and 'write'. This setting is optional. Useful in such cases https://docs.sheetjs.com/docs/solutions/output#example-remote-file
    });
  } catch (error) {
    //handle the error
    console.log("Error: ", error.message || "Something went wrong");
  } finally {
    await driver.quit();
  }
}

function fakePromise(secondsToResolve) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve("Fake promise resolved after 10 seconds");
    }, secondsToResolve * 1000); // x seconds delay
  });
}

getProspects();
