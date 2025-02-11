const express = require('express');
const router = express.Router();
const Task = require('../models/task');
const auth = require('../middleware/auth');


router.post('/', auth, async (req, res) => {
    try {
        const task = new Task({
            ...req.body,
            createdBy: req.user.userId,
            assignedTo: req.user.role === 'admin' ? req.body.assignedTo : req.user.userId
        });

        await task.save();
        await task.populate('assignedTo', 'name email');
        res.status(201).json(task);
    } catch (error) {
        res.status(400).json({ message: 'Error creating task', error: error.message });
    }
});

router.get('/', auth, async (req, res) => {
    try {
        const filter = req.user.role === 'admin' ? {} : { assignedTo: req.user.userId };
        const tasks = await Task.find(filter)
            .populate('assignedTo', 'name email')
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });

        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching tasks', error: error.message });
    }
});

router.patch('/:id', auth, async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        // Check if user has permission to update this task
        if (req.user.role !== 'admin' && task.assignedTo.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Not authorized to update this task' });
        }

        const updatedTask = await Task.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        ).populate('assignedTo', 'name email');

        res.json(updatedTask);
    } catch (error) {
        res.status(400).json({ message: 'Error updating task', error: error.message });
    }
});

router.delete('/:id', auth, async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        // Check if user has permission to delete this task
        if (req.user.role !== 'admin' && task.assignedTo.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Not authorized to delete this task' });
        }

        await task.remove();
        res.json({ message: 'Task deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting task', error: error.message });
    }
});

module.exports = router;

