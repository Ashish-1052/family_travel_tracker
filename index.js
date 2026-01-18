import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "family_travel_tracker",
  password: "Ask@NSK1052!?",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;

async function checkVisisted(user_id) {
  const result = await db.query("SELECT country_code FROM visited_countries WHERE user_id = $1", [user_id]);
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}
app.get("/", async (req, res) => {
  try {
    const countries = await checkVisisted(currentUserId);
    const users = await db.query("SELECT * FROM users");
    res.render("index.ejs", {
      countries: countries,
      total: countries.length,
      users: users.rows,
      color: "teal",
    });
  } catch (err) {
    console.log(err);
  }
});
app.post("/add", async (req, res) => {
  const input = req.body["country"];

  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );
    const data = result.rows[0];
    const countryCode = data.country_code;
    try {
      await db.query(
        "INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2)",
        [countryCode, currentUserId]
      );
      res.redirect("/");
    } catch (err) {
      console.log(err);
    }
  } catch (err) {
    console.log(err);
  }
});
app.post("/user", async (req, res) => {
  const user_id = req.body.user;
  const add = req.body.add;
  const query = "SELECT * FROM users JOIN visited_countries ON users.id = visited_countries.user_id WHERE users.id = $1";
  try {
    if (add === "new") {
      res.render("new.ejs");
    } else {
      const result = await db.query(query, [user_id]);
      console.log(result.rows);
      const data = result.rows[0];
      currentUserId = user_id;
      const countries = await checkVisisted(user_id);
      console.log('countries', countries);
      console.log('data', data);
      const users = await db.query("SELECT * FROM users");

      if (data) {
        res.render("index.ejs", {
          countries: countries,
          total: countries.length,
          users: users.rows,
          color: data.color,
        });
      } else {
        res.render("index.ejs", {
          countries: [],
          total: 0,
          users: users.rows,
          color: "transparent",
        });
      }
    }
  } catch (err) {
    console.log(err);
  }
});

app.post("/new", async (req, res) => {
  //Hint: The RETURNING keyword can return the data that was inserted.
  //https://www.postgresql.org/docs/current/dml-returning.html
  try {
    const input_name = req.body.name;
    const input_color = req.body.color;
    try {
      await db.query("INSERT INTO users (name, color) VALUES ($1, $2)", [input_name, input_color]);
      res.redirect("/");
    } catch (err) {
      console.log(err);
    }
  } catch (err) {
    console.log(err);
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
