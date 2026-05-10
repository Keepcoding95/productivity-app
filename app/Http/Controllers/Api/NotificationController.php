<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function unreadCount(Request $request): \Illuminate\Http\JsonResponse
    {
        $count = $request->user()->notifications()->whereNull('read_at')->count();

        return response()->json(['count' => $count]);
    }

    public function index(Request $request): \Illuminate\Http\JsonResponse
    {
        $notifications = $request->user()
            ->notifications()
            ->with('task:id,title,project_id,due_date,status')
            ->orderByDesc('created_at')
            ->limit(50)
            ->get();

        $unreadCount = $request->user()->notifications()->whereNull('read_at')->count();

        return response()->json([
            'data' => $notifications,
            'unread_count' => $unreadCount,
        ]);
    }

    public function markRead(Request $request, Notification $notification): \Illuminate\Http\JsonResponse
    {
        abort_unless($notification->user_id === $request->user()->id, 403);

        $notification->update(['read_at' => now()]);

        return response()->json($notification);
    }

    public function markAllRead(Request $request): \Illuminate\Http\JsonResponse
    {
        $request->user()->notifications()->whereNull('read_at')->update(['read_at' => now()]);

        return response()->json(['message' => 'All marked read']);
    }
}
