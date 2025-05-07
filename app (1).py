from flask import Flask, render_template, request, jsonify, send_file
import sqlite3
import json
import os
import pandas as pd
from datetime import datetime
import io

app = Flask(__name__)

# Ensure the instance folder exists
if not os.path.exists('instance'):
    os.makedirs('instance')

# Initialize database
def init_db():
    conn = sqlite3.connect('instance/expenses.db')
    cursor = conn.cursor()
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount REAL NOT NULL,
        category TEXT NOT NULL,
        date TEXT NOT NULL,
        note TEXT
    )
    ''')
    conn.commit()
    conn.close()

# Initialize the database when the app starts
init_db()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/add', methods=['POST'])
def add_expense():
    try:
        data = request.json
        amount = float(data['amount'])
        category = data['category']
        date = data['date']
        note = data['note']
        
        # Validate data
        if amount <= 0:
            return jsonify({'success': False, 'message': 'Amount must be positive'}), 400
        
        conn = sqlite3.connect('instance/expenses.db')
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO expenses (amount, category, date, note) VALUES (?, ?, ?, ?)',
            (amount, category, date, note)
        )
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Expense added successfully'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/data', methods=['GET'])
def get_data():
    try:
        conn = sqlite3.connect('instance/expenses.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Get all expenses
        cursor.execute('SELECT * FROM expenses ORDER BY date DESC')
        expenses = [dict(row) for row in cursor.fetchall()]
        
        # Get expenses by category for pie chart
        cursor.execute('''
            SELECT category, SUM(amount) as total
            FROM expenses
            GROUP BY category
        ''')
        categories = [dict(row) for row in cursor.fetchall()]
        
        # Get monthly total
        current_month = datetime.now().strftime('%Y-%m')
        cursor.execute('''
            SELECT SUM(amount) as monthly_total
            FROM expenses
            WHERE date LIKE ?
        ''', (f'{current_month}%',))
        monthly_total = cursor.fetchone()['monthly_total'] or 0
        
        conn.close()
        
        return jsonify({
            'success': True,
            'expenses': expenses,
            'categories': categories,
            'monthly_total': monthly_total
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/export', methods=['GET'])
def export_data():
    try:
        conn = sqlite3.connect('instance/expenses.db')
        query = "SELECT * FROM expenses ORDER BY date DESC"
        df = pd.read_sql_query(query, conn)
        conn.close()
        
        # Create a buffer to store the CSV
        buffer = io.StringIO()
        df.to_csv(buffer, index=False)
        buffer.seek(0)
        
        # Create a response with the CSV
        output = io.BytesIO()
        output.write(buffer.getvalue().encode('utf-8'))
        output.seek(0)
        
        return send_file(
            output,
            mimetype='text/csv',
            as_attachment=True,
            download_name=f'expenses_{datetime.now().strftime("%Y%m%d")}.csv'
        )
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)