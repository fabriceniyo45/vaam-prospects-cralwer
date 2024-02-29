require("dotenv").config();
const { Builder, Browser, By, until } = require("selenium-webdriver");
const { Options } = require("selenium-webdriver/chrome");

const xlsx = require("json-as-xlsx");

async function getProspects() {
  const chromeOptions = new Options();
  chromeOptions.addArguments("user-data-dir=selenium"); //storing the sessions
  let driver = await new Builder()
    .forBrowser(Browser.CHROME)
    .setChromeOptions(chromeOptions)
    .build();
  try {
    await driver.get("https://app.vaam.io/prospects");
    await driver.manage().window().setRect({ width: 1512, height: 860 });
    // await driver.findElement(By.id("email")).click();
    // await driver.findElement(By.id("email")).sendKeys(process.env.VAAM_EMAIL);
    // await driver.findElement(By.id("password")).click();
    // await driver
    //   .findElement(By.id("password"))
    //   .sendKeys(process.env.VAAM_PASSWORD);
    // await driver.findElement(By.id("btn-login")).click();

    //wait for the page to load
    // await driver.wait(until.titleIs("Vaam | Outreach Dashboard"), 1000);

    // //get prospect a tag
    // const tags = await driver.findElements(By.tagName("a"));
    // console.log({ links: tags.length });

    // for (let i = 0; i < tags.length; i++) {
    //   const link = await tags[i].getAttribute("href");
    //   console.log({ link });
    //   if (link === "https://app.vaam.io/prospects") {
    //     await tags[i].click();
    //     break;
    //   }
    // }

    // await fakePromise(30); //pause so that we can login manually (only for the first time)
    //wait for the prospects page
    await driver.wait(until.titleIs("Vaam | Prospects"), 1000);

    //wait for the prospects list to load
    console.log("Waiting for the prospects to load....");
    await fakePromise(10);

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
      // for (let i = 1; i < 5; i++) {
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

        const detailedTrs = await detailedTable.findElements(By.tagName("tr"));
        console.log({ detailedTrs: detailedTrs.length });
        let obj2 = {};
        for (let x = 0; x < detailedTrs.length; x++) {
          const tds = await detailedTrs[x].findElements(By.tagName("td"));

          // if (tds.length > 2) return; //we expects only 2

          //get attribute name
          const attr = await returnAttributeName(tds[0]);
          const value = await returnAttributeValue(tds[1]);

          //current attributes
          const allAttrs = Object.keys(obj2);
          if (allAttrs.includes(attr)) {
            const similarAttrs = allAttrs.filter((item) => item == attr);
            obj2[attr + "_" + similarAttrs.length] = value;
          } else {
            obj2[attr] = value;
          }

          // console.log({ attr, value });
        }

        //getting the sequence status
        let sequence_type = "";
        let sequence_status = "";
        try {
          const detailedDataContainer = await driver.findElement(
            By.xpath("/html/body/div[3]/div/div/div")
          );
          const tables = await detailedDataContainer.findElements(
            By.tagName("table")
          );

          const trsForStatusTable = await tables[1].findElements(
            By.tagName("tr")
          );

          const statusTds = await trsForStatusTable[1].findElements(
            By.tagName("td")
          );

          sequence_type = await returnSpanValue(statusTds[0]);
          sequence_status = await returnSpanValue(statusTds[1]);
        } catch (error) {}

        obj2.sequence_status = sequence_status;
        obj2.sequence_type = sequence_type;

        //glab our data!
        prospectDetails.push(obj2);

        //close the pannel
        await driver.findElement(By.xpath("/html/body/div[3]/button")).click();

        //Nice, next job!
      }
    }

    console.log({ propsects });
    console.log({ prospectDetails });

    console.log(".....GENERATING EXCEL FILES....");

    //prepare excel data
    let prospectsExcelColumns = [];
    propsects.forEach((prospect) => {
      const keys = Object.keys(prospect);
      if (keys.length > prospectsExcelColumns.length) {
        prospectsExcelColumns = [...keys];
      }
    });
    //content
    const prospectsContents = propsects.map((prospect) => {
      const obj = {};
      for (let i = 0; i < prospectsExcelColumns.length; i++) {
        obj[prospectsExcelColumns[i]] =
          prospect[prospectsExcelColumns[i]] || "";
      }
      return obj;
    });

    const prospectsExcellData = [
      {
        sheet: "Prospects list",
        columns: prospectsExcelColumns.map((item) => ({
          label: item,
          value: item,
        })),
        content: prospectsContents,
      },
    ];

    xlsx(prospectsExcellData, {
      fileName: "prospects",
      writeMode: "writeFile", // The available parameters are 'WriteFile' and 'write'. This setting is optional. Useful in such cases https://docs.sheetjs.com/docs/solutions/output#example-remote-file
    });

    //
    let prospectDetailsExcelColumns = [];
    prospectDetails.forEach((prospect) => {
      const keys = Object.keys(prospect);
      if (keys.length > prospectDetailsExcelColumns.length) {
        prospectDetailsExcelColumns = [...keys];
      }
    });
    //content
    const prospectDetailsContents = prospectDetails.map((prospect) => {
      const obj = {};
      for (let i = 0; i < prospectDetailsExcelColumns.length; i++) {
        obj[prospectDetailsExcelColumns[i]] =
          prospect[prospectDetailsExcelColumns[i]] || "";
      }
      return obj;
    });

    const prospectDetailsExcelData = [
      {
        sheet: "Prospects details",
        columns: prospectDetailsExcelColumns.map((item) => ({
          label: item,
          value: item,
        })),
        content: prospectDetailsContents,
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

const returnAttributeName = async (parentElement) => {
  try {
    const label = await parentElement.findElement(By.tagName("label"));
    const text = await label.getText();
    if (text != "") return text;
  } catch (error) {}

  try {
    const div = await parentElement.findElement(By.tagName("div"));
    const text = await div.getText();
    if (text != "") return text;
  } catch (error) {}

  try {
    const text = await parentElement.getText();
    if (text != "") return text;
  } catch (error) {
    console.log({ error });
  }

  try {
    const text = await parentElement.getAttribute("innerHTML");
    if (text != "") return text;
  } catch (error) {
    console.log({ error });
  }

  return "_unknown_0";
};

const returnAttributeValue = async (parentElement) => {
  try {
    const input = await parentElement.findElement(By.tagName("input"));
    const value = await input.getAttribute("value");
    return value;
  } catch (error) {}

  try {
    const textarea = await parentElement.findElement(By.tagName("textarea"));
    const value = await textarea.getAttribute("value");
    return value;
  } catch (error) {}

  return "";
};

const returnSpanValue = async (parentElement) => {
  try {
    const span = await parentElement.findElement(By.tagName("span"));
    const value = await span.getText();
    return value;
  } catch (error) {
    console.log({ error });
  }

  return "";
};

function fakePromise(secondsToResolve) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve("Fake promise resolved after 10 seconds");
    }, secondsToResolve * 1000); // x seconds delay
  });
}

getProspects();
