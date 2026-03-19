import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "../.env") });

import mongoose from "mongoose";
import Timetable from "../models/Timetable.js";

const data = [

  // ===================== SECTION A - MONDAY =====================
  {
    branch: "CSE", year: 1, section: "A", day: "Monday",
    slots: [
      { time: "09:00-09:50", subject: "Fundamentals of Computing", teacher: "Dr. Aqib Nazir Mir", room: "306" },
      { time: "09:50-10:40", subject: "Basics of Electronics & Communication Engg.", teacher: "Dr. Seema Kumari", room: "306" },
      { time: "10:40-11:30", subject: "Basics of Electrical Engg.", teacher: "Prof. Naimul Hasan", room: "306" },
      { time: "11:30-12:20", subject: "Engg. Physics-II", teacher: "Prof. M. Mudassir Husain", room: "306" },
      { time: "01:40-02:30", subject: "Engg. Physics-II", teacher: "Prof. M. Mudassir Husain", room: "306" },
      { time: "02:30-03:20", subject: "Engg. Mathematics-II", teacher: "Prof. Musheer Ahmad", room: "306" },
    ],
  },

  // ===================== SECTION B - MONDAY =====================
  {
    branch: "CSE", year: 1, section: "B", day: "Monday",
    slots: [
      { time: "09:00-09:50", subject: "Engg. Physics-II", teacher: "Dr. Islam Uddin", room: "240" },
      { time: "09:50-10:40", subject: "Engg. Mathematics-II", teacher: "Prof. Quddus Khan", room: "240" },
      { time: "10:40-11:30", subject: "Biology for Engineers", teacher: "Dr. Sadaf", room: "240" },
      { time: "11:30-12:20", subject: "Fundamentals of Computing", teacher: "Mr. Hannan Mansoor", room: "240" },
      { time: "01:40-04:10", subject: "Engineering Graphics & Design Lab", teacher: "Dr. Mohd Shaaban Hussain", room: "Engineering Graphics Lab" },
    ],
  },

  // ===================== SECTION C - MONDAY =====================
  {
    branch: "CSE", year: 1, section: "C", day: "Monday",
    slots: [
      { time: "09:00-09:50", subject: "Basics of Electronics & Communication Engg.", teacher: "Dr. Seema Kumari", room: "324" },
      { time: "09:50-10:40", subject: "Fundamentals of Computing", teacher: "Dr. Aqib Nazir Mir", room: "324" },
      { time: "10:40-11:30", subject: "Engg. Mathematics-II", teacher: "Prof. Musheer Ahmad", room: "324" },
      { time: "11:30-12:20", subject: "Basics of Electrical Engg.", teacher: "Prof. Naimul Hasan", room: "324" },
      { time: "01:40-02:30", subject: "Engg. Physics-II", teacher: "Dr. Islam Uddin", room: "324" },
      { time: "02:30-03:20", subject: "Biology for Engineers", teacher: "Dr. Sadaf", room: "324" },
    ],
  },

  // ===================== SECTION D - MONDAY =====================
  {
    branch: "CSE", year: 1, section: "D", day: "Monday",
    slots: [
      { time: "09:00-09:50", subject: "Biology for Engineers", teacher: "Dr. Sadaf", room: "238" },
      { time: "09:50-10:40", subject: "Engg. Mathematics-II", teacher: "Prof. Atiya Perveen", room: "238" },
      { time: "10:40-11:30", subject: "Basics of Electrical Engg.", teacher: "Prof. Naimul Hasan", room: "238" },
      { time: "11:30-12:20", subject: "Engg. Mathematics-II", teacher: "Prof. Atiya Perveen", room: "238" },
      { time: "01:40-02:30", subject: "Basics of Electronics & Communication Engg.", teacher: "Dr. Tulika Bajpai", room: "238" },
      { time: "02:30-03:20", subject: "Constitution of India", teacher: "Dr. Mohammad Haroon Anwar", room: "238" },
    ],
  },

  // ===================== SECTION E - MONDAY =====================
  {
    branch: "CSE", year: 1, section: "E", day: "Monday",
    slots: [
      { time: "09:00-10:40", subject: "Physics Laboratory-II", teacher: "Prof. M. Mudassir Husain", room: "Physics Lab" },
      { time: "10:40-12:20", subject: "Chemistry Lab", teacher: "", room: "Chemistry Lab" },
      { time: "01:40-02:30", subject: "Engg. Mathematics-II", teacher: "Prof. Quddus Khan", room: "237" },
      { time: "02:30-03:20", subject: "Basics of Electronics & Communication Engg.", teacher: "Dr. Rumysa Manzoor", room: "237" },
    ],
  },

  // ===================== SECTION F - MONDAY =====================
  {
    branch: "CSE", year: 1, section: "F", day: "Monday",
    slots: [
      { time: "09:00-10:40", subject: "EM Lab", teacher: "", room: "EM Lab" },
      { time: "10:40-12:20", subject: "Language Lab", teacher: "", room: "Language Lab" },
      { time: "01:40-02:30", subject: "Basics of Civil Engg.", teacher: "Dr. Ibadur Rahman", room: "238" },
      { time: "02:30-03:20", subject: "Constitution of India", teacher: "Dr. Mohammad Haroon Anwar", room: "238" },
    ],
  },

  // ===================== SECTION G - MONDAY =====================
  {
    branch: "CSE", year: 1, section: "G", day: "Monday",
    slots: [
      { time: "09:00-09:50", subject: "Constitution of India", teacher: "Dr. Mohammad Haroon Anwar", room: "237" },
      { time: "09:50-10:40", subject: "Basics of Civil Engg.", teacher: "Dr. Md. Arif Faridi", room: "237" },
      { time: "10:40-11:30", subject: "Engg. Mathematics-II", teacher: "Prof. Musheer Ahmad", room: "237" },
      { time: "11:30-12:20", subject: "Engg. Mathematics-II", teacher: "Prof. Musheer Ahmad", room: "237" },
      { time: "01:40-02:30", subject: "Basics of Electronics & Communication Engg.", teacher: "Dr. Rumysa Manzoor", room: "237" },
      { time: "02:30-03:20", subject: "Engg. Physics-II", teacher: "Dr. Islam Uddin", room: "237" },
    ],
  },

  // ===================== SECTION H - MONDAY =====================
  {
    branch: "CSE", year: 1, section: "H", day: "Monday",
    slots: [
      { time: "09:00-09:50", subject: "Engg. Mathematics-II", teacher: "Prof. Atiya Perveen", room: "119" },
      { time: "09:50-10:40", subject: "Engg. Physics-II", teacher: "Dr. Islam Uddin", room: "119" },
      { time: "10:40-11:30", subject: "Basics of Civil Engg.", teacher: "Dr. Saba Shamim", room: "119" },
      { time: "11:30-12:20", subject: "Basics of Mechanical Engg.", teacher: "Prof. Tasmeem A Khan", room: "119" },
      { time: "01:40-02:30", subject: "Communication Skills", teacher: "Dr. Satya Prakash Prasad", room: "324" },
      { time: "02:30-03:20", subject: "Engg. Physics-II", teacher: "Dr. Islam Uddin", room: "324" },
    ],
  },

  // ===================== SECTION A - TUESDAY =====================
  {
    branch: "CSE", year: 1, section: "A", day: "Tuesday",
    slots: [
      { time: "09:00-09:50", subject: "Fundamentals of Computing", teacher: "Dr. Aqib Nazir Mir", room: "306" },
      { time: "09:50-10:40", subject: "Basics of Electronics & Communication Engg.", teacher: "Dr. Seema Kumari", room: "306" },
      { time: "10:40-11:30", subject: "Engg. Mathematics-II", teacher: "Prof. Musheer Ahmad", room: "306" },
      { time: "11:30-12:20", subject: "Engg. Physics-II", teacher: "Prof. M. Mudassir Husain", room: "306" },
      { time: "01:40-02:30", subject: "Basics of Electronics & Communication Engg.", teacher: "Dr. Seema Kumari", room: "306" },
      { time: "02:30-03:20", subject: "Engg. Mathematics-II", teacher: "Prof. Musheer Ahmad", room: "306" },
    ],
  },

  // ===================== SECTION B - TUESDAY =====================
  {
    branch: "CSE", year: 1, section: "B", day: "Tuesday",
    slots: [
      { time: "09:00-09:50", subject: "Basics of Electrical Engg.", teacher: "Prof. Naimul Hasan", room: "240" },
      { time: "09:50-10:40", subject: "Basics of Electronics & Communication Engg.", teacher: "Dr. Seema Kumari", room: "240" },
      { time: "10:40-11:30", subject: "Engg. Mathematics-II", teacher: "Prof. Quddus Khan", room: "240" },
      { time: "11:30-12:20", subject: "Engg. Mathematics-II", teacher: "Prof. Quddus Khan", room: "240" },
      { time: "01:40-02:30", subject: "Engg. Physics-II", teacher: "Dr. Islam Uddin", room: "306" },
      { time: "02:30-03:20", subject: "Engg. Physics-II", teacher: "Dr. Islam Uddin", room: "306" },
    ],
  },

  // ===================== SECTION C - TUESDAY =====================
  {
    branch: "CSE", year: 1, section: "C", day: "Tuesday",
    slots: [
      { time: "09:00-09:50", subject: "Fundamentals of Computing", teacher: "Dr. Aqib Nazir Mir", room: "324" },
      { time: "09:50-10:40", subject: "Basics of Electronics & Communication Engg.", teacher: "Dr. Seema Kumari", room: "324" },
      { time: "10:40-11:30", subject: "Engg. Mathematics-II", teacher: "Prof. Musheer Ahmad", room: "324" },
      { time: "11:30-12:20", subject: "Engg. Mathematics-II", teacher: "Prof. Musheer Ahmad", room: "324" },
      { time: "01:40-04:10", subject: "Engineering Graphics & Design Lab", teacher: "Dr. Irfan Ahmad Ansari", room: "Engineering Graphics Lab" },
    ],
  },

  // ===================== SECTION D - TUESDAY =====================
  {
    branch: "CSE", year: 1, section: "D", day: "Tuesday",
    slots: [
      { time: "09:00-09:50", subject: "Basics of Electrical Engg.", teacher: "Prof. Naimul Hasan", room: "238" },
      { time: "09:50-10:40", subject: "Engg. Mathematics-II", teacher: "Prof. Atiya Perveen", room: "238" },
      { time: "10:40-11:30", subject: "Fundamentals of Computing", teacher: "Mr. Hannan Mansoor", room: "238" },
      { time: "11:30-12:20", subject: "Basics of Electronics & Communication Engg.", teacher: "Dr. Tulika Bajpai", room: "238" },
      { time: "01:40-04:10", subject: "Engineering Graphics & Design Lab", teacher: "Dr. Mohd Shaaban Hussain", room: "Engineering Graphics Lab" },
    ],
  },

  // ===================== SECTION E - TUESDAY =====================
  {
    branch: "CSE", year: 1, section: "E", day: "Tuesday",
    slots: [
      { time: "09:00-10:40", subject: "EM Lab", teacher: "", room: "EM Lab" },
      { time: "10:40-12:20", subject: "Language Lab", teacher: "", room: "Language Lab" },
      { time: "01:40-02:30", subject: "Basics of Mechanical Engg.", teacher: "Prof. Tasmeem A Khan", room: "238" },
      { time: "02:30-03:20", subject: "Fundamentals of Computing", teacher: "Dr. S. M. Faisal Malik", room: "238" },
    ],
  },

  // ===================== SECTION F - TUESDAY =====================
  {
    branch: "CSE", year: 1, section: "F", day: "Tuesday",
    slots: [
      { time: "09:00-09:50", subject: "Engg. Physics-II", teacher: "Dr. Islam Uddin", room: "238" },
      { time: "09:50-10:40", subject: "Engg. Mathematics-II", teacher: "Prof. Quddus Khan", room: "238" },
      { time: "10:40-11:30", subject: "Basics of Mechanical Engg.", teacher: "Prof. Tasmeem A Khan", room: "238" },
      { time: "11:30-12:20", subject: "Basics of Civil Engg.", teacher: "Dr. Ibadur Rahman", room: "238" },
      { time: "01:40-04:10", subject: "Physics Laboratory-II", teacher: "Dr. Islam Uddin", room: "Physics Lab" },
    ],
  },

  // ===================== SECTION G - TUESDAY =====================
  {
    branch: "CSE", year: 1, section: "G", day: "Tuesday",
    slots: [
      { time: "09:00-09:50", subject: "Basics of Civil Engg.", teacher: "Dr. Md. Arif Faridi", room: "237" },
      { time: "09:50-10:40", subject: "Engg. Mathematics-II", teacher: "Prof. Musheer Ahmad", room: "237" },
      { time: "10:40-11:30", subject: "Engg. Physics-II", teacher: "Dr. Islam Uddin", room: "237" },
      { time: "11:30-12:20", subject: "Basics of Mechanical Engg.", teacher: "Prof. Tasmeem A Khan", room: "237" },
      { time: "01:40-02:30", subject: "Basics of Civil Engg.", teacher: "Dr. Md. Arif Faridi", room: "237" },
      { time: "02:30-03:20", subject: "Engg. Mathematics-II", teacher: "Prof. Musheer Ahmad", room: "237" },
    ],
  },

  // ===================== SECTION H - TUESDAY =====================
  {
    branch: "CSE", year: 1, section: "H", day: "Tuesday",
    slots: [
      { time: "09:00-09:50", subject: "Engg. Chemistry", teacher: "Mr. Rajesh B. Jadhao", room: "119" },
      { time: "09:50-10:40", subject: "Engg. Mathematics-II", teacher: "Prof. Atiya Perveen", room: "119" },
      { time: "10:40-11:30", subject: "Constitution of India", teacher: "Dr. Mohammad Haroon Anwar", room: "119" },
      { time: "11:30-12:20", subject: "Basics of Mechanical Engg.", teacher: "Prof. Tasmeem A Khan", room: "119" },
      { time: "01:40-02:30", subject: "Engg. Physics-II", teacher: "Dr. Islam Uddin", room: "324" },
      { time: "02:30-03:20", subject: "Communication Skills", teacher: "Dr. Satya Prakash Prasad", room: "324" },
    ],
  },

  // ===================== SECTION A - WEDNESDAY =====================
  {
    branch: "CSE", year: 1, section: "A", day: "Wednesday",
    slots: [
      { time: "09:00-12:20", subject: "Workshop Practice", teacher: "Prof. Z. Mallick", room: "Workshop Lab" },
      { time: "01:40-02:30", subject: "Engg. Physics-II", teacher: "Prof. M. Mudassir Husain", room: "237" },
      { time: "02:30-03:20", subject: "Fundamentals of Computing", teacher: "Dr. Aqib Nazir Mir", room: "237" },
    ],
  },

  // ===================== SECTION B - WEDNESDAY =====================
  {
    branch: "CSE", year: 1, section: "B", day: "Wednesday",
    slots: [
      { time: "09:00-09:50", subject: "Fundamentals of Computing", teacher: "Mr. Hannan Mansoor", room: "324" },
      { time: "09:50-10:40", subject: "Basics of Electrical Engg.", teacher: "Prof. Naimul Hasan", room: "324" },
      { time: "10:40-11:30", subject: "Biology for Engineers", teacher: "Dr. Sadaf", room: "324" },
      { time: "11:30-12:20", subject: "Engg. Mathematics-II", teacher: "Prof. Quddus Khan", room: "324" },
      { time: "01:40-02:30", subject: "Engg. Physics-II", teacher: "Dr. Islam Uddin", room: "306" },
      { time: "02:30-03:20", subject: "Engg. Physics-II", teacher: "Dr. Islam Uddin", room: "306" },
    ],
  },

  // ===================== SECTION C - WEDNESDAY =====================
  {
    branch: "CSE", year: 1, section: "C", day: "Wednesday",
    slots: [
      { time: "09:00-09:50", subject: "Fundamentals of Computing", teacher: "Dr. Aqib Nazir Mir", room: "240" },
      { time: "09:50-10:40", subject: "Basics of Electronics & Communication Engg.", teacher: "Dr. Seema Kumari", room: "240" },
      { time: "10:40-11:30", subject: "Biology for Engineers", teacher: "Dr. Sadaf", room: "240" },
      { time: "11:30-12:20", subject: "Basics of Electrical Engg.", teacher: "Prof. Naimul Hasan", room: "240" },
      { time: "01:40-04:10", subject: "Engineering Graphics & Design Lab", teacher: "Dr. Irfan Ahmad Ansari", room: "Engineering Graphics Lab" },
    ],
  },

  // ===================== SECTION D - WEDNESDAY =====================
  {
    branch: "CSE", year: 1, section: "D", day: "Wednesday",
    slots: [
      { time: "09:00-09:50", subject: "Basics of Electronics & Communication Engg.", teacher: "Dr. Tulika Bajpai", room: "119" },
      { time: "09:50-10:40", subject: "Engg. Mathematics-II", teacher: "Prof. Atiya Perveen", room: "119" },
      { time: "10:40-11:30", subject: "Fundamentals of Computing", teacher: "Mr. Hannan Mansoor", room: "119" },
      { time: "11:30-12:20", subject: "Basics of Electrical Engg.", teacher: "Prof. Naimul Hasan", room: "119" },
      { time: "01:40-04:10", subject: "Engineering Graphics & Design Lab", teacher: "Dr. Mohd Shaaban Hussain", room: "Engineering Graphics Lab" },
    ],
  },

  // ===================== SECTION E - WEDNESDAY =====================
  {
    branch: "CSE", year: 1, section: "E", day: "Wednesday",
    slots: [
      { time: "09:00-09:50", subject: "Engg. Mathematics-II", teacher: "Prof. Quddus Khan", room: "238" },
      { time: "09:50-10:40", subject: "Engg. Physics-II", teacher: "Dr. Islam Uddin", room: "238" },
      { time: "10:40-11:30", subject: "Basics of Mechanical Engg.", teacher: "Prof. Tasmeem A Khan", room: "238" },
      { time: "11:30-12:20", subject: "Basics of Electrical Engg.", teacher: "Dr. Md Muzammil Sani", room: "238" },
      { time: "01:40-02:30", subject: "Communication Skills", teacher: "Dr. Satya Prakash Prasad", room: "238" },
      { time: "02:30-03:20", subject: "Constitution of India", teacher: "Dr. Mohammad Haroon Anwar", room: "238" },
    ],
  },

  // ===================== SECTION F - WEDNESDAY =====================
  {
    branch: "CSE", year: 1, section: "F", day: "Wednesday",
    slots: [
      { time: "09:00-09:50", subject: "Engg. Mathematics-II", teacher: "Prof. Quddus Khan", room: "324" },
      { time: "09:50-10:40", subject: "Basics of Civil Engg.", teacher: "Dr. Ibadur Rahman", room: "324" },
      { time: "10:40-11:30", subject: "Engg. Physics-II", teacher: "Dr. Islam Uddin", room: "324" },
      { time: "11:30-12:20", subject: "Basics of Mechanical Engg.", teacher: "Prof. Tasmeem A Khan", room: "324" },
      { time: "01:40-02:30", subject: "Communication Skills", teacher: "Dr. Satya Prakash Prasad", room: "238" },
      { time: "02:30-03:20", subject: "Constitution of India", teacher: "Dr. Mohammad Haroon Anwar", room: "238" },
    ],
  },

  // ===================== SECTION G - WEDNESDAY =====================
  {
    branch: "CSE", year: 1, section: "G", day: "Wednesday",
    slots: [
      { time: "09:00-09:50", subject: "Basics of Mechanical Engg.", teacher: "Prof. Tasmeem A Khan", room: "237" },
      { time: "09:50-10:40", subject: "Engg. Mathematics-II", teacher: "Prof. Musheer Ahmad", room: "237" },
      { time: "10:40-11:30", subject: "Engg. Physics-II", teacher: "Dr. Islam Uddin", room: "237" },
      { time: "11:30-12:20", subject: "Engg. Chemistry", teacher: "Mr. Rajesh B. Jadhao", room: "237" },
      { time: "01:40-02:30", subject: "Constitution of India", teacher: "Dr. Mohammad Haroon Anwar", room: "237" },
      { time: "02:30-03:20", subject: "Communication Skills", teacher: "Dr. Satya Prakash Prasad", room: "237" },
    ],
  },

  // ===================== SECTION H - WEDNESDAY =====================
  {
    branch: "CSE", year: 1, section: "H", day: "Wednesday",
    slots: [
      { time: "09:00-10:40", subject: "EM Lab", teacher: "", room: "EM Lab" },
      { time: "10:40-12:20", subject: "Language Lab", teacher: "", room: "Language Lab" },
      { time: "01:40-02:30", subject: "Engg. Chemistry", teacher: "Mr. Rajesh B. Jadhao", room: "119" },
      { time: "02:30-03:20", subject: "Constitution of India", teacher: "Dr. Mohammad Haroon Anwar", room: "119" },
    ],
  },

  // ===================== SECTION A - THURSDAY =====================
  {
    branch: "CSE", year: 1, section: "A", day: "Thursday",
    slots: [
      { time: "09:00-09:50", subject: "Engg. Mathematics-II", teacher: "Prof. Musheer Ahmad", room: "306" },
      { time: "09:50-10:40", subject: "Basics of Electrical Engg.", teacher: "Prof. Naimul Hasan", room: "306" },
      { time: "10:40-11:30", subject: "Fundamentals of Computing", teacher: "Dr. Aqib Nazir Mir", room: "306" },
      { time: "11:30-12:20", subject: "Basics of Electronics & Communication Engg.", teacher: "Dr. Seema Kumari", room: "306" },
    ],
  },

  // ===================== SECTION B - THURSDAY =====================
  {
    branch: "CSE", year: 1, section: "B", day: "Thursday",
    slots: [
      { time: "09:00-09:50", subject: "Engg. Physics-II", teacher: "Dr. Islam Uddin", room: "324" },
      { time: "09:50-10:40", subject: "Biology for Engineers", teacher: "Dr. Sadaf", room: "324" },
      { time: "10:40-11:30", subject: "Engg. Mathematics-II", teacher: "Prof. Quddus Khan", room: "324" },
      { time: "11:30-12:20", subject: "Fundamentals of Computing", teacher: "Mr. Hannan Mansoor", room: "324" },
      { time: "01:40-04:10", subject: "Workshop Practice", teacher: "Prof. Z. Mallick", room: "Workshop Lab" },
    ],
  },

  // ===================== SECTION C - THURSDAY =====================
  {
    branch: "CSE", year: 1, section: "C", day: "Thursday",
    slots: [
      { time: "09:00-09:50", subject: "Basics of Civil Engg.", teacher: "Dr. Ibadur Rahman", room: "324" },
      { time: "09:50-10:40", subject: "Engg. Mathematics-II", teacher: "Prof. Musheer Ahmad", room: "324" },
      { time: "10:40-11:30", subject: "Basics of Electronics & Communication Engg.", teacher: "Dr. Seema Kumari", room: "324" },
      { time: "11:30-12:20", subject: "Engg. Physics-II", teacher: "Dr. Islam Uddin", room: "324" },
      { time: "01:40-04:10", subject: "Workshop Practice", teacher: "Prof. Z. Mallick", room: "Workshop Lab" },
    ],
  },

  // ===================== SECTION D - THURSDAY =====================
  {
    branch: "CSE", year: 1, section: "D", day: "Thursday",
    slots: [
      { time: "09:00-09:50", subject: "Basics of Mechanical Engg.", teacher: "Prof. Tasmeem A Khan", room: "238" },
      { time: "09:50-10:40", subject: "Basics of Civil Engg.", teacher: "Dr. Ibadur Rahman", room: "238" },
      { time: "10:40-11:30", subject: "Engg. Mathematics-II", teacher: "Prof. Atiya Perveen", room: "238" },
      { time: "11:30-12:20", subject: "Biology for Engineers", teacher: "Dr. Sadaf", room: "238" },
      { time: "01:40-04:10", subject: "Workshop Practice", teacher: "Prof. Z. Mallick", room: "Workshop Lab" },
    ],
  },

  // ===================== SECTION E - THURSDAY =====================
  {
    branch: "CSE", year: 1, section: "E", day: "Thursday",
    slots: [
      { time: "09:00-09:50", subject: "Basics of Electronics & Communication Engg.", teacher: "Dr. Rumysa Manzoor", room: "238" },
      { time: "09:50-10:40", subject: "Biology for Engineers", teacher: "Dr. Sadaf", room: "238" },
      { time: "10:40-11:30", subject: "Engg. Mathematics-II", teacher: "Prof. Quddus Khan", room: "238" },
      { time: "11:30-12:20", subject: "Basics of Electrical Engg.", teacher: "Dr. Md Muzammil Sani", room: "238" },
      { time: "01:40-04:10", subject: "Workshop Practice", teacher: "Prof. Z. Mallick", room: "Workshop Lab" },
    ],
  },

  // ===================== SECTION F - THURSDAY =====================
  {
    branch: "CSE", year: 1, section: "F", day: "Thursday",
    slots: [
      { time: "09:00-09:50", subject: "Basics of Mechanical Engg.", teacher: "Prof. Tasmeem A Khan", room: "240" },
      { time: "09:50-10:40", subject: "Engg. Physics-II", teacher: "Dr. Islam Uddin", room: "240" },
      { time: "10:40-12:20", subject: "EM Lab", teacher: "", room: "EM Lab" },
      { time: "01:40-02:30", subject: "Engg. Chemistry", teacher: "Mr. Rajesh B. Jadhao", room: "238" },
      { time: "02:30-03:20", subject: "Engg. Mathematics-II", teacher: "Prof. Quddus Khan", room: "238" },
    ],
  },

  // ===================== SECTION G - THURSDAY =====================
  {
    branch: "CSE", year: 1, section: "G", day: "Thursday",
    slots: [
      { time: "09:00-10:40", subject: "Physics Laboratory-II", teacher: "Dr. Islam Uddin", room: "Physics Lab" },
      { time: "10:40-12:20", subject: "Chemistry Lab", teacher: "", room: "Chemistry Lab" },
      { time: "01:40-02:30", subject: "Communication Skills", teacher: "Dr. Satya Prakash Prasad", room: "237" },
      { time: "02:30-03:20", subject: "Constitution of India", teacher: "Dr. Mohammad Haroon Anwar", room: "237" },
    ],
  },

  // ===================== SECTION H - THURSDAY =====================
  {
    branch: "CSE", year: 1, section: "H", day: "Thursday",
    slots: [
      { time: "09:00-09:50", subject: "Basics of Mechanical Engg.", teacher: "Prof. Tasmeem A Khan", room: "324" },
      { time: "09:50-10:40", subject: "Engg. Mathematics-II", teacher: "Prof. Atiya Perveen", room: "324" },
      { time: "10:40-11:30", subject: "Engg. Physics-II", teacher: "Dr. Islam Uddin", room: "324" },
      { time: "11:30-12:20", subject: "Engg. Chemistry", teacher: "Mr. Rajesh B. Jadhao", room: "324" },
      { time: "01:40-04:10", subject: "Workshop Practice", teacher: "Prof. Z. Mallick", room: "Workshop Lab" },
    ],
  },

  // ===================== SECTION A - FRIDAY =====================
  {
    branch: "CSE", year: 1, section: "A", day: "Friday",
    slots: [
      { time: "08:30-09:30", subject: "Engg. Physics-II", teacher: "Prof. M. Mudassir Husain", room: "306" },
      { time: "09:30-10:30", subject: "Physics Laboratory-II", teacher: "Prof. M. Mudassir Husain", room: "Physics Lab" },
      { time: "10:30-11:30", subject: "Design Thinking Lab", teacher: "Dr. Navaid Zafar Rizvi", room: "Design Lab" },
      { time: "11:30-12:30", subject: "Workshop Practice", teacher: "Prof. Z. Mallick", room: "Workshop Lab" },
    ],
  },

  // ===================== SECTION B - FRIDAY =====================
  {
    branch: "CSE", year: 1, section: "B", day: "Friday",
    slots: [
      { time: "09:00-09:50", subject: "Engg. Mathematics-II", teacher: "Prof. Quddus Khan", room: "240" },
      { time: "09:50-10:40", subject: "Basics of Electrical Engg.", teacher: "Prof. Naimul Hasan", room: "240" },
      { time: "10:40-11:30", subject: "Biology for Engineers", teacher: "Dr. Sadaf", room: "240" },
      { time: "11:30-12:20", subject: "Basics of Civil Engg.", teacher: "Dr. Ibadur Rahman", room: "240" },
    ],
  },

  // ===================== SECTION C - FRIDAY =====================
  {
    branch: "CSE", year: 1, section: "C", day: "Friday",
    slots: [
      { time: "09:00-09:50", subject: "Basics of Electronics & Communication Engg.", teacher: "Dr. Seema Kumari", room: "306" },
      { time: "09:50-10:40", subject: "Engg. Mathematics-II", teacher: "Prof. Musheer Ahmad", room: "306" },
      { time: "10:40-11:30", subject: "Engg. Physics-II", teacher: "Dr. Islam Uddin", room: "306" },
      { time: "11:30-12:20", subject: "Fundamentals of Computing", teacher: "Dr. Aqib Nazir Mir", room: "306" },
    ],
  },

  // ===================== SECTION D - FRIDAY =====================
  {
    branch: "CSE", year: 1, section: "D", day: "Friday",
    slots: [
      { time: "09:00-09:50", subject: "Biology for Engineers", teacher: "Dr. Sadaf", room: "240" },
      { time: "09:50-10:40", subject: "Engg. Mathematics-II", teacher: "Prof. Atiya Perveen", room: "240" },
      { time: "10:40-11:30", subject: "Basics of Civil Engg.", teacher: "Dr. Ibadur Rahman", room: "240" },
      { time: "11:30-12:20", subject: "Engg. Chemistry", teacher: "Mr. Rajesh B. Jadhao", room: "240" },
    ],
  },

  // ===================== SECTION E - FRIDAY =====================
  {
    branch: "CSE", year: 1, section: "E", day: "Friday",
    slots: [
      { time: "09:00-09:50", subject: "Basics of Mechanical Engg.", teacher: "Prof. Tasmeem A Khan", room: "238" },
      { time: "09:50-10:40", subject: "Basics of Electronics & Communication Engg.", teacher: "Dr. Rumysa Manzoor", room: "238" },
      { time: "10:40-11:30", subject: "Engg. Mathematics-II", teacher: "Prof. Quddus Khan", room: "238" },
      { time: "11:30-12:20", subject: "Biology for Engineers", teacher: "Dr. Sadaf", room: "238" },
    ],
  },

  // ===================== SECTION F - FRIDAY =====================
  {
    branch: "CSE", year: 1, section: "F", day: "Friday",
    slots: [
      { time: "09:00-09:50", subject: "Engg. Physics-II", teacher: "Dr. Islam Uddin", room: "238" },
      { time: "09:50-10:40", subject: "Engg. Mathematics-II", teacher: "Prof. Quddus Khan", room: "238" },
      { time: "10:40-11:30", subject: "Basics of Mechanical Engg.", teacher: "Prof. Tasmeem A Khan", room: "238" },
      { time: "11:30-12:20", subject: "Communication Skills", teacher: "Dr. Satya Prakash Prasad", room: "238" },
    ],
  },

  // ===================== SECTION G - FRIDAY =====================
  {
    branch: "CSE", year: 1, section: "G", day: "Friday",
    slots: [
      { time: "09:00-09:50", subject: "Basics of Civil Engg.", teacher: "Dr. Md. Arif Faridi", room: "237" },
      { time: "09:50-10:40", subject: "Engg. Chemistry", teacher: "Mr. Rajesh B. Jadhao", room: "237" },
      { time: "10:40-11:30", subject: "Engg. Mathematics-II", teacher: "Prof. Musheer Ahmad", room: "237" },
      { time: "11:30-12:20", subject: "Basics of Electronics & Communication Engg.", teacher: "Dr. Rumysa Manzoor", room: "237" },
    ],
  },

  // ===================== SECTION H - FRIDAY =====================
  {
    branch: "CSE", year: 1, section: "H", day: "Friday",
    slots: [
      { time: "09:00-09:50", subject: "Engg. Mathematics-II", teacher: "Prof. Atiya Perveen", room: "324" },
      { time: "09:50-10:40", subject: "Basics of Civil Engg.", teacher: "Dr. Saba Shamim", room: "324" },
      { time: "10:40-11:30", subject: "Basics of Mechanical Engg.", teacher: "Prof. Tasmeem A Khan", room: "324" },
      { time: "11:30-12:20", subject: "Engg. Mathematics-II", teacher: "Prof. Atiya Perveen", room: "324" },
    ],
  },
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    await Timetable.deleteMany({ year: 1, section: { $in: ["A", "B", "C", "D", "E", "F", "G", "H"] } });
    console.log("🗑️ Cleared old timetable data for Year 1");

    await Timetable.insertMany(data);
    console.log(`✅ Inserted ${data.length} timetable entries successfully!`);

    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
};

seed();