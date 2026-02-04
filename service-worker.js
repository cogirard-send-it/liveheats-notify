self.addEventListener("push", (event) => {
  const data = event.data?.json() || { title: "Update", body: "New LiveHeats event update" };

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon.png"
    })
  );
});
