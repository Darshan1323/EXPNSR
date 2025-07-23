import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

export default function EmailTemplate({
  userName = "",
  type = "monthly-report",
  data = {},
}) {
  if (type === "monthly-report") {
    const {
      month = "",
      stats = {
        totalIncome: 0,
        totalExpenses: 0,
        transactionCount: 0,
        byCategory: {},
      },
      insights = [],
    } = data || {};

    const net = stats.totalIncome - stats.totalExpenses;

    return (
      <Html>
        <Head />
        <Preview>Your Monthly Financial Report</Preview>
        <Body style={styles.body}>
          <Container style={styles.container}>
            <Heading style={styles.title}>📊 Monthly Financial Report</Heading>
            <Text style={styles.text}>Hello {userName},</Text>
            <Text style={styles.text}>
              Here’s your financial summary for {month}:
            </Text>

            <Section style={styles.section}>
              <Text style={styles.text}>
                <strong>Total Income:</strong> ${stats.totalIncome.toFixed(2)}
              </Text>
              <Text style={styles.text}>
                <strong>Total Expenses:</strong> ${stats.totalExpenses.toFixed(2)}
              </Text>
              <Text style={styles.text}>
                <strong>Net:</strong> ${net.toFixed(2)}
              </Text>
              <Text style={styles.text}>
                <strong>Transactions:</strong> {stats.transactionCount}
              </Text>
            </Section>

            {Object.keys(stats.byCategory).length > 0 && (
              <Section style={styles.section}>
                <Heading style={styles.heading}>Spending by Category</Heading>
                {Object.entries(stats.byCategory).map(([cat, amount]) => (
                  <Text style={styles.text} key={cat}>
                    • {cat}: ${amount.toFixed(2)}
                  </Text>
                ))}
              </Section>
            )}

            {insights.length > 0 && (
              <Section style={styles.section}>
                <Heading style={styles.heading}>💡 Insights</Heading>
                <ul>
                  {insights.map((insight, i) => (
                    <li key={i}>
                      <Text style={styles.text}>{insight}</Text>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            <Text style={styles.footer}>
              Thanks for using Expnsr. Keep tracking and improving!
            </Text>
          </Container>
        </Body>
      </Html>
    );
  }

  if (type === "budget-alert") {
    const {
      percentageUsed = 0,
      budgetAmount = "0.00",
      totalExpenses = "0.00",
      accountName = "your account",
    } = data || {};

    return (
      <Html>
        <Head />
        <Preview>⚠️ Budget Limit Alert</Preview>
        <Body style={styles.body}>
          <Container style={styles.container}>
            <Heading style={styles.title}>🚨 Budget Alert</Heading>
            <Text style={styles.text}>Hello {userName},</Text>
            <Text style={styles.text}>
              You’ve used <strong>{percentageUsed.toFixed(1)}%</strong> of your monthly budget for{" "}
              <strong>{accountName}</strong>.
            </Text>
            <Text style={styles.text}>
              Budget: ${budgetAmount} <br />
              Expenses: ${totalExpenses}
            </Text>
            <Text style={styles.footer}>
              Keep an eye on your spending to avoid overshooting your budget.
            </Text>
          </Container>
        </Body>
      </Html>
    );
  }

  return null;
}

const styles = {
  body: {
    backgroundColor: "#f6f9fc",
    fontFamily: "-apple-system, sans-serif",
  },
  container: {
    backgroundColor: "#ffffff",
    margin: "0 auto",
    padding: "20px",
    borderRadius: "5px",
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
  },
  title: {
    color: "#1f2937",
    fontSize: "32px",
    fontWeight: "bold",
    textAlign: "center",
    margin: "0 0 20px",
  },
  heading: {
    color: "#1f2937",
    fontSize: "20px",
    fontWeight: "600",
    margin: "0 0 16px",
  },
  text: {
    color: "#4b5563",
    fontSize: "16px",
    margin: "0 0 16px",
  },
  section: {
    marginTop: "32px",
    padding: "20px",
    backgroundColor: "#f9fafb",
    borderRadius: "5px",
    border: "1px solid #e5e7eb",
  },
  footer: {
    color: "#6b7280",
    fontSize: "14px",
    textAlign: "center",
    marginTop: "32px",
    paddingTop: "16px",
    borderTop: "1px solid #e5e7eb",
  },
};
